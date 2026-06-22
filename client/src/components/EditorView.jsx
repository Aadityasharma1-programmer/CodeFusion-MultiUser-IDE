/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { sendAiChat, executeCode, upsertFile, loadProjectFiles } from '../api/auth'
import { LANG_LABELS, getExtensionForLang } from '../store/projectStore'
import FileExplorer, { getLangFromName } from './FileExplorer'
import SearchPanel from './SearchPanel'
import ExtensionsPanel, { EXTENSIONS } from './ExtensionsPanel'
import GitGraphView from './GitGraphView'
import ExtensionDetailView from './ExtensionDetailView'
import OutlinePanel from './OutlinePanel'
import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import { MonacoBinding } from 'y-monaco'
import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

/* ── colour tokens ── */
const C = {
  bg: '#131313',
  voidBlack: '#000000',
  surfaceContLow: '#1c1b1b',
  surfaceCont: '#201f1f',
  surfaceContHigh: '#2a2a2a',
  surfaceContHighest: '#353534',
  surfaceBright: '#3a3939',
  onSurface: '#e5e2e1',
  onSurfaceVar: '#bdc8d1',
  primary: '#8ed5ff',
  onPrimary: '#00354a',
  primaryCont: '#38bdf8',
  cyberPink: '#F43F5E',
  neonBlue: '#38BDF8',
  matrixGreen: '#10B981',
  secondary: '#ffb2b7',
  error: '#ffb4ab',
  glassBorder: 'rgba(255,255,255,0.10)',
  warningAmber: '#e2c044',
}

/* ── Icon helper so Material Symbols render correctly ── */
function Icon({ name, size = 24, fill = 0, style = {}, color }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontFamily: "'Material Symbols Outlined', sans-serif",
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        lineHeight: 1,
        display: 'inline-block',
        verticalAlign: 'middle',
        userSelect: 'none',
        color: color,
        ...style,
      }}
    >
      {name}
    </span>
  )
}

function AiMessage({ text }) {
  const parts = []
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'code', lang: match[1] || 'text', content: match[2].trim() })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return (
    <div className="space-y-2">
      {parts.map((part, i) =>
        part.type === 'code' ? (
          <CodeBlock key={i} code={part.content} lang={part.lang} />
        ) : (
          <TextBlock key={i} text={part.content} />
        )
      )}
    </div>
  )
}

function TextBlock({ text }) {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-surface-bright px-1 py-0.5 rounded text-neon-blue font-mono text-[10px]">$1</code>')
    .replace(/\n/g, '<br/>')
  return <p className="leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
}

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-lg overflow-hidden border border-glass-border bg-void-black mt-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-container-highest border-b border-glass-border">
        <span className="text-[10px] font-mono text-slate-500 uppercase">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[11px] font-mono text-on-surface-variant leading-relaxed whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
    </div>
  )
}

const MODES = [
  { id: 'chat', icon: 'forum', label: 'Chat', color: 'text-violet-400' },
  { id: 'explain', icon: 'auto_awesome', label: 'Explain', color: 'text-primary' },
  { id: 'fix', icon: 'bug_report', label: 'Fix', color: 'text-cyber-pink' },
  { id: 'complete', icon: 'code', label: 'Complete', color: 'text-matrix-green' },
]

const PLACEHOLDER = {
  chat: 'Ask Fusion AI...',
  explain: 'What should I explain? (or just hit Send)',
  fix: 'Describe the bug, or just hit Send to auto-detect',
  complete: 'Describe what to add next...',
}

const TEAM = [
  { name: 'Alice', color: 'border-matrix-green', initial: 'A' },
  { name: 'Bob', color: 'border-primary-container', initial: 'B' },
]

/* ════════════════════════════════════════════════════════════════════════
   ARTIFACTS SYSTEM
   Antigravity's core trust primitive: instead of dumping raw AI output,
   structured deliverables are rendered as their own reviewable cards.
   Three kinds are supported here: Task List, Implementation Plan, Diff Summary.
   Each supports inline, non-blocking comments (Google-Doc style feedback).
   ════════════════════════════════════════════════════════════════════════ */

const ARTIFACT_TYPES = {
  task_list: { label: 'Task List', icon: 'checklist', color: '#38BDF8' },
  plan: { label: 'Implementation Plan', icon: 'flowchart', color: '#8ed5ff' },
  diff: { label: 'Diff Summary', icon: 'difference', color: '#10B981' },
}

/* Heuristic classifier: decides if/what kind of artifact an AI reply implies.
   Real Antigravity has the agent explicitly emit structured plans; here we
   derive the same shape from mode + reply content so it works with the
   existing /ai/chat backend without changing its contract. */
function deriveArtifactFromReply({ mode, prompt, reply }) {
  const hasCode = /```/.test(reply)
  const lower = (prompt + ' ' + reply).toLowerCase()

  // Fix / multi-step bug work → Task List
  if (mode === 'fix' || /\b(steps?|first,|then,|finally,|todo)\b/i.test(reply)) {
    const stepMatches = reply.match(/(?:^|\n)\s*(?:\d+[\.\)]|[-*])\s+.+/g) || []
    if (stepMatches.length >= 2) {
      const steps = stepMatches.slice(0, 8).map(s => s.replace(/^\s*(?:\d+[\.\)]|[-*])\s+/, '').trim())
      return {
        type: 'task_list',
        title: mode === 'fix' ? 'Bug Fix Task List' : 'Task Breakdown',
        steps: steps.map(s => ({ text: s, status: 'done' })), // chat already completed these synchronously
      }
    }
  }

  // Complete / structural code change → Implementation Plan summary
  if (mode === 'complete' && hasCode) {
    return {
      type: 'plan',
      title: 'Implementation Plan',
      summary: `Added new code to satisfy: "${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}"`,
      details: [
        'Reviewed existing file structure and surrounding logic',
        'Generated new code matching current conventions',
        'Code inserted below — review before accepting',
      ],
    }
  }

  // Any reply containing a code block while editing a real file → Diff Summary
  if (hasCode) {
    const codeBlocks = reply.match(/```(\w*)\n?([\s\S]*?)```/g) || []
    return {
      type: 'diff',
      title: 'Diff Summary',
      summary: `Proposed change to ${mode === 'explain' ? 'no files (explanation only)' : '1 file'}`,
      filesChanged: mode === 'explain' ? [] : ['current file'],
      blockCount: codeBlocks.length,
    }
  }

  return null
}

function ArtifactComments({ comments, onAdd }) {
  const [draft, setDraft] = useState('')
  return (
    <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${C.glassBorder}` }}>
      {comments.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2">
          {comments.map((c, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10.5px]" style={{ color: C.onSurfaceVar }}>
              <Icon name="chat_bubble" size={11} color={C.warningAmber} style={{ marginTop: 1 }} />
              <span>{c}</span>
            </div>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return; onAdd(draft.trim()); setDraft('') }}
        className="flex items-center gap-1.5"
      >
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Leave feedback on this artifact…"
          className="flex-1 bg-void-black border border-glass-border rounded-md px-2 py-1 text-[10.5px] text-on-surface outline-none focus:border-primary"
        />
        <button type="submit" className="text-[10px] px-2 py-1 rounded-md cursor-pointer" style={{ color: C.primary, background: 'rgba(142,213,255,0.1)' }}>
          Comment
        </button>
      </form>
    </div>
  )
}

function TaskListArtifact({ artifact, comments, onComment }) {
  const [open, setOpen] = useState(true)
  const doneCount = artifact.steps.filter(s => s.status === 'done').length
  return (
    <div className="rounded-lg overflow-hidden mt-2" style={{ border: `1px solid ${ARTIFACT_TYPES.task_list.color}40`, background: 'rgba(56,189,248,0.06)' }}>
      <div className="flex items-center justify-between px-3 py-2 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <Icon name={ARTIFACT_TYPES.task_list.icon} size={15} color={ARTIFACT_TYPES.task_list.color} />
          <span className="text-[11px] font-bold" style={{ color: C.onSurface }}>{artifact.title}</span>
          <span className="text-[10px]" style={{ color: C.onSurfaceVar }}>{doneCount}/{artifact.steps.length}</span>
        </div>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={16} color={C.onSurfaceVar} />
      </div>
      {open && (
        <div className="px-3 pb-3">
          <div className="flex flex-col gap-1.5">
            {artifact.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]" style={{ color: C.onSurface }}>
                <Icon name={s.status === 'done' ? 'check_box' : 'check_box_outline_blank'} size={14} color={s.status === 'done' ? C.matrixGreen : C.onSurfaceVar} style={{ marginTop: 1 }} />
                <span>{s.text}</span>
              </div>
            ))}
          </div>
          <ArtifactComments comments={comments} onAdd={onComment} />
        </div>
      )}
    </div>
  )
}

function PlanArtifact({ artifact, comments, onComment }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-lg overflow-hidden mt-2" style={{ border: `1px solid ${ARTIFACT_TYPES.plan.color}40`, background: 'rgba(142,213,255,0.06)' }}>
      <div className="flex items-center justify-between px-3 py-2 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <Icon name={ARTIFACT_TYPES.plan.icon} size={15} color={ARTIFACT_TYPES.plan.color} />
          <span className="text-[11px] font-bold" style={{ color: C.onSurface }}>{artifact.title}</span>
        </div>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={16} color={C.onSurfaceVar} />
      </div>
      {open && (
        <div className="px-3 pb-3">
          <p className="text-[11px] mb-2" style={{ color: C.onSurfaceVar }}>{artifact.summary}</p>
          <div className="flex flex-col gap-1">
            {artifact.details.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-[10.5px]" style={{ color: C.onSurface }}>
                <span style={{ color: C.primary }}>{i + 1}.</span>
                <span>{d}</span>
              </div>
            ))}
          </div>
          <ArtifactComments comments={comments} onAdd={onComment} />
        </div>
      )}
    </div>
  )
}

function DiffSummaryArtifact({ artifact, comments, onComment }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-lg overflow-hidden mt-2" style={{ border: `1px solid ${ARTIFACT_TYPES.diff.color}40`, background: 'rgba(16,185,129,0.06)' }}>
      <div className="flex items-center justify-between px-3 py-2 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <Icon name={ARTIFACT_TYPES.diff.icon} size={15} color={ARTIFACT_TYPES.diff.color} />
          <span className="text-[11px] font-bold" style={{ color: C.onSurface }}>{artifact.title}</span>
        </div>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={16} color={C.onSurfaceVar} />
      </div>
      {open && (
        <div className="px-3 pb-3">
          <p className="text-[11px] mb-1" style={{ color: C.onSurfaceVar }}>{artifact.summary}</p>
          {artifact.filesChanged.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              {artifact.filesChanged.map((f, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: C.matrixGreen }}>{f}</span>
              ))}
            </div>
          )}
          <span className="text-[10px]" style={{ color: C.onSurfaceVar }}>{artifact.blockCount} code block{artifact.blockCount !== 1 ? 's' : ''} proposed below ↓</span>
          <ArtifactComments comments={comments} onAdd={onComment} />
        </div>
      )}
    </div>
  )
}

function ArtifactCard({ artifact, comments, onComment }) {
  if (artifact.type === 'task_list') return <TaskListArtifact artifact={artifact} comments={comments} onComment={onComment} />
  if (artifact.type === 'plan') return <PlanArtifact artifact={artifact} comments={comments} onComment={onComment} />
  if (artifact.type === 'diff') return <DiffSummaryArtifact artifact={artifact} comments={comments} onComment={onComment} />
  return null
}

export default function EditorView({ project, onNavigate, onCodeChange }) {
  const { user, profile } = useAuthStore()
  const [code, setCode] = useState(project?.code || '')
  const codesKey = `cf_codes_${project?.id || 'default'}`

  // ── Multi-file state ──────────────────────────────────────────────────────
  const [activeFile, setActiveFile] = useState(null)   // { id, name, content, lang, isGitGraph, isExtensionDetail }
  const [openTabs, setOpenTabs] = useState([])     // [{ id, name, lang, isGitGraph, isExtensionDetail, extensionData }]
  const [fileCodes, setFileCodes] = useState({})     // { fileId: content }
  const [running, setRunning] = useState(false)
  const [terminalHeight, setTerminalHeight] = useState(192)
  const [saveStatus, setSaveStatus] = useState('idle')
  const saveTimerRef = useRef(null)
  const fileCodesRef = useRef({})
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  // ── Neural Mesh Scan System ──
  const activeTimersRef = useRef([])
  const pulseRafIdRef = useRef(null)

  const clearAllTimers = () => {
    activeTimersRef.current.forEach(clearTimeout)
    activeTimersRef.current = []
    if (pulseRafIdRef.current) {
      cancelAnimationFrame(pulseRafIdRef.current)
      pulseRafIdRef.current = null
    }
  }

  // Curved connector between two points
  const curvedPath = (x1, y1, x2, y2, bow) => {
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const dx = x2 - x1, dy = y2 - y1
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = -dy / dist, ny = dx / dist
    const cx = mx + nx * bow
    const cy = my + ny * bow
    return { d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`, cx, cy }
  }

  const triggerVeinAnimation = () => {
    clearAllTimers()

    const veinsSvg = document.getElementById('veins-svg')
    if (!veinsSvg) return

    // Clear any highlight residue
    const highlightedEls = document.querySelectorAll('.mesh-highlighted')
    highlightedEls.forEach(el => {
      el.classList.remove('mesh-highlighted', 'border-cyber-pink/50', 'bg-cyber-pink/5', 'scale-[1.01]', 'shadow-[0_0_15px_rgba(244,63,94,0.15)]')
    })

    appendTerminalLines(['[WARN] AI neural core spinning up scan mesh...'])

    veinsSvg.style.display = 'block'
    veinsSvg.style.opacity = '0'
    veinsSvg.innerHTML = ''
    requestAnimationFrame(() => { veinsSvg.style.opacity = '1' })

    const vw = window.innerWidth
    const vh = window.innerHeight
    veinsSvg.setAttribute('viewBox', `0 0 ${vw} ${vh}`)

    // Origin: AI typing indicator, fallback to prompt input textarea
    const typingIndicatorEl = document.getElementById('ai-typing-indicator')
    const inputEl = typingIndicatorEl || inputRef.current || document.getElementById('terminal-input-prompt')
    const inputRect = inputEl ? inputEl.getBoundingClientRect() : { left: vw - 300, top: vh - 100, width: 200, height: 50 }
    const origin = {
      x: inputRect.left + inputRect.width / 2,
      y: inputRect.top + inputRect.height / 2,
      id: 'origin'
    }

    const nodes = [origin]

    // Gather file explorer items
    const explorerElList = []
    const rawExplorerNodes = document.querySelectorAll('.file-explorer-node')
    rawExplorerNodes.forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        explorerElList.push({
          el: el,
          rect: rect,
          name: el.getAttribute('data-file-name') || 'item',
          type: el.getAttribute('data-file-type') || 'file',
          depth: parseInt(el.getAttribute('data-file-depth') || '0', 10)
        })
      }
    })

    const totalFiles = explorerElList.filter(item => item.type === 'file').length

    const folderStack = []
    const fileNodes = []

    explorerElList.forEach((item, idx) => {
      while (folderStack.length > 0 && folderStack[folderStack.length - 1].depth >= item.depth) {
        folderStack.pop()
      }
      const parentFolderNode = folderStack.length > 0 ? folderStack[folderStack.length - 1].node : null

      // If totalFiles <= 10, limit file nodes to 6 nodes total to preserve original display behavior
      if (totalFiles <= 10 && fileNodes.length >= 6) {
        return
      }

      const nodeObj = {
        x: item.type === 'folder' ? item.rect.left + 16 : item.rect.left + 24,
        y: item.rect.top + item.rect.height / 2,
        id: `file-node-${idx}`,
        name: item.name,
        el: item.el,
        type: item.type,
        depth: item.depth,
        parentFolder: parentFolderNode,
        isAlert: item.name.toLowerCase().includes('auth') || false
      }

      if (item.type === 'folder') {
        folderStack.push({ node: nodeObj, depth: item.depth })
      }

      fileNodes.push(nodeObj)
    })

    nodes.push(...fileNodes)

    // Gather open tab nodes
    const tabElements = document.querySelectorAll('.min-w-max.group')
    tabElements.forEach((el, index) => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0 && index < 3) {
        nodes.push({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          id: `tab-node-${index}`,
          name: el.textContent || 'Tab',
          el: el,
          isAlert: false
        })
      }
    })

    // Target active editor
    const editorEl = document.querySelector('.monaco-editor')
    if (editorEl) {
      const rect = editorEl.getBoundingClientRect()
      nodes.push({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        id: 'editor-node',
        name: 'Active Editor',
        el: editorEl,
        isAlert: false
      })
    }

    // Target terminal
    const terminalEl = document.querySelector('.bg-void-black.border-t')
    if (terminalEl) {
      const rect = terminalEl.getBoundingClientRect()
      nodes.push({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        id: 'terminal-node',
        name: 'System Terminal',
        el: terminalEl,
        isAlert: false
      })
    }

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    defs.innerHTML = `
      <radialGradient id="nodeGlowBlue" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#38BDF8" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="nodeGlowPink" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#F43F5E" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#F43F5E" stop-opacity="0"/>
      </radialGradient>
    `
    veinsSvg.appendChild(defs)

    const edgeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const nodeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    veinsSvg.appendChild(edgeLayer)
    veinsSvg.appendChild(nodeLayer)

    const edges = []
    const targetNodes = nodes.filter(n => n.id !== 'origin')

    if (totalFiles > 10) {
      // Hierarchical branching edges: origin -> root folder nodes, folders -> child elements
      targetNodes.forEach(n => {
        if (n.id.startsWith('file-node-')) {
          if (n.parentFolder) {
            edges.push({ a: n.parentFolder, b: n, isAlert: n.isAlert || n.parentFolder.isAlert })
          } else {
            edges.push({ a: origin, b: n, isAlert: n.isAlert })
          }
        } else {
          edges.push({ a: origin, b: n, isAlert: n.isAlert })
        }
      })
    } else {
      // Default flat edges
      targetNodes.forEach(n => {
        edges.push({ a: origin, b: n, isAlert: n.isAlert })
      })
    }

    // Cross-links between target nodes
    targetNodes.forEach((n, i) => {
      let nearest = null, nearestDist = Infinity
      const maxDist = totalFiles > 10 ? 120 : 350
      targetNodes.forEach((m, j) => {
        if (i === j) return
        const d = Math.hypot(n.x - m.x, n.y - m.y)
        if (d < nearestDist && d < maxDist) { nearestDist = d; nearest = m }
      })
      if (nearest) {
        const exists = edges.some(e =>
          (e.a === n && e.b === nearest) || (e.a === nearest && e.b === n))
        if (!exists) edges.push({ a: n, b: nearest, isAlert: false, cross: true })
      }
    })

    const edgeData = edges.map(e => {
      const bow = (Math.random() - 0.5) * 60
      const { d } = curvedPath(e.a.x, e.a.y, e.b.x, e.b.y, bow)
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', d)
      path.classList.add('mesh-edge')
      edgeLayer.appendChild(path)

      const len = path.getTotalLength() || 1
      path.style.strokeDasharray = len
      path.style.strokeDashoffset = len
      path.style.transition = `stroke-dashoffset 1.1s cubic-bezier(0.25,0.46,0.45,0.94)`

      return { path, len, edge: e }
    })

    const nodeData = nodes.map(n => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      g.classList.add('mesh-node')

      const isAlertNode = n.isAlert
      const isOrigin = n.id === 'origin'

      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      halo.setAttribute('cx', n.x); halo.setAttribute('cy', n.y)
      halo.setAttribute('r', isOrigin ? 22 : 16)
      halo.setAttribute('fill', isAlertNode || isOrigin ? 'url(#nodeGlowPink)' : 'url(#nodeGlowBlue)')
      halo.style.opacity = '0'
      halo.style.transition = 'opacity 0.6s ease'

      const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      core.setAttribute('cx', n.x); core.setAttribute('cy', n.y)
      core.setAttribute('r', 0)
      core.classList.add('mesh-node-core')
      core.setAttribute('fill', isOrigin ? '#fff' : (isAlertNode ? '#F43F5E' : '#38BDF8'))
      core.setAttribute('stroke', isOrigin ? '#fff' : (isAlertNode ? '#F43F5E' : '#38BDF8'))
      core.style.color = isAlertNode ? '#F43F5E' : '#38BDF8'
      core.style.transition = 'r 0.4s cubic-bezier(0.34,1.56,0.64,1)'

      let label = null
      if (!isOrigin) {
        label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        label.setAttribute('x', n.x + 12)
        label.setAttribute('y', n.y - 12)
        label.classList.add('mesh-label')
        label.textContent = n.name
      }

      g.appendChild(halo)
      g.appendChild(core)
      if (label) g.appendChild(label)
      nodeLayer.appendChild(g)

      return { g, halo, core, label, node: n, isAlertNode, isOrigin, el: n.el }
    })

    // 1. Origin node pops
    const originData = nodeData.find(n => n.isOrigin)
    if (originData) {
      originData.halo.style.opacity = '0.8'
      originData.core.setAttribute('r', 6)
    }

    // 2. Grow edges
    edgeData.forEach(ed => {
      ed.grown = false
      let delay = 0
      if (totalFiles > 10 && ed.edge.a.id.startsWith('file-node-')) {
        delay = (ed.edge.a.depth + 1) * 750 + Math.random() * 150
      } else {
        const distFromOrigin = ed.edge.cross ? 400 : Math.hypot(ed.edge.a.x - origin.x, ed.edge.a.y - origin.y)
        delay = ed.edge.cross ? 700 + Math.random() * 600 : Math.min(900, distFromOrigin * 0.6)
      }

      const t = setTimeout(() => {
        ed.path.style.strokeDashoffset = '0'
        ed.path.classList.add('mesh-edge-active')
        if (ed.edge.isAlert) ed.path.classList.add('mesh-edge-alert')
        const growTimer = setTimeout(() => { ed.grown = true }, 1100)
        activeTimersRef.current.push(growTimer)
      }, delay)
      activeTimersRef.current.push(t)
    })

    // 3. Target nodes appear
    targetNodes.forEach((n, i) => {
      let delay = 0
      if (totalFiles > 10 && n.id.startsWith('file-node-')) {
        delay = n.depth * 750 + 750
      } else {
        const dist = Math.hypot(n.x - origin.x, n.y - origin.y)
        delay = Math.min(950, dist * 0.62) + 80
      }

      const t = setTimeout(() => {
        const nd = nodeData.find(x => x.node === n)
        if (nd) {
          nd.halo.style.opacity = '0.7'
          nd.core.setAttribute('r', n.isAlert ? 6 : 4.5)
          nd.core.classList.add(n.isAlert ? 'mesh-node-alert' : 'mesh-node-idle')
          if (nd.label) nd.label.classList.add('mesh-label-visible')

          const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          ring.setAttribute('cx', n.x); ring.setAttribute('cy', n.y)
          ring.classList.add('mesh-ring')
          ring.setAttribute('stroke', n.isAlert ? '#F43F5E' : '#38BDF8')
          nodeLayer.appendChild(ring)
          const ringTimer = setTimeout(() => ring.remove(), 1500)
          activeTimersRef.current.push(ringTimer)
        }
      }, delay)
      activeTimersRef.current.push(t)
    })

    // 4. Traveling pulses
    let pulseStart = performance.now()
    const pulseDots = edgeData.map(ed => {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      dot.setAttribute('r', 2.2)
      dot.classList.add('mesh-pulse-dot')
      dot.setAttribute('fill', ed.edge.isAlert ? '#ff8fa3' : '#9fe3ff')
      dot.style.color = ed.edge.isAlert ? '#F43F5E' : '#38BDF8'
      dot.style.opacity = '0'
      edgeLayer.appendChild(dot)
      return { dot, path: ed.path, len: ed.len, edgeRef: ed, offset: Math.random(), speed: 0.00035 + Math.random() * 0.0003 }
    })

    const animatePulses = (now) => {
      const elapsed = now - pulseStart
      pulseDots.forEach(pd => {
        const total = pd.len
        if (!total) return
        pd.dot.style.opacity = pd.edgeRef.grown ? '0.95' : '0'
        if (pd.edgeRef.grown) {
          const t = ((elapsed * pd.speed) + pd.offset) % 1
          const pt = pd.path.getPointAtLength(t * total)
          pd.dot.setAttribute('cx', pt.x)
          pd.dot.setAttribute('cy', pt.y)
        }
      })
      pulseRafIdRef.current = requestAnimationFrame(animatePulses)
    }
    pulseRafIdRef.current = requestAnimationFrame(animatePulses)

    // 5. Staggered scan highlight and logs
    targetNodes.forEach((n, i) => {
      let delay = 1000 + i * 400
      if (totalFiles > 10 && n.id.startsWith('file-node-')) {
        delay = n.depth * 750 + 900
      }
      
      const t = setTimeout(() => {
        if (n.el) {
          n.el.classList.add('mesh-highlighted', 'border-cyber-pink/50', 'bg-cyber-pink/5', 'scale-[1.01]', 'shadow-[0_0_15px_rgba(244,63,94,0.15)]')
        }
        appendTerminalLines([
          n.isAlert 
            ? `[WARN] Mesh node reached ${n.name}: WARNING - Potential bottleneck/bug identified.`
            : `[INFO] Mesh node reached ${n.name}: Clean.`
        ])
      }, delay)
      activeTimersRef.current.push(t)
    })

    // 6. Thinking convergence
    const convergenceTimer = setTimeout(() => {
      appendTerminalLines(['[INFO] Mesh fully connected. Resolving and compiling fixes...'])
      nodeData.forEach(nd => {
        if (nd.core) {
          nd.core.style.transition = 'r 0.3s ease'
          nd.halo.style.opacity = '1'
        }
      })
      edgeData.forEach(ed => ed.path.classList.add('mesh-edge-active'))
    }, 1000 + targetNodes.length * 400 + 400)
    activeTimersRef.current.push(convergenceTimer)

    // 7. Dissolve Mesh
    const dissolveTimer = setTimeout(() => {
      appendTerminalLines(['[INFO] Patches applied. Dissolving neural scan mesh...'])
      if (veinsSvg) veinsSvg.style.opacity = '0'
      nodeData.forEach(nd => {
        if (nd.el) {
          nd.el.classList.remove('mesh-highlighted', 'border-cyber-pink/50', 'bg-cyber-pink/5', 'scale-[1.01]', 'shadow-[0_0_15px_rgba(244,63,94,0.15)]')
        }
      })
    }, 1000 + targetNodes.length * 400 + 2000)
    activeTimersRef.current.push(dissolveTimer)

    // 8. Resolve final success
    const finalResolveTimer = setTimeout(() => {
      if (veinsSvg) veinsSvg.style.display = 'none'
      clearAllTimers()
      appendTerminalLines([
        '[SUCCESS] Workspace files scan complete. 0 defects, 0 warnings remaining.',
        '[SUCCESS] Systems state: NOMINAL.'
      ])
    }, 1000 + targetNodes.length * 400 + 3500)
    activeTimersRef.current.push(finalResolveTimer)
  }

  useEffect(() => {
    return () => {
      // Clean up animation timers on unmount
      activeTimersRef.current.forEach(clearTimeout)
      if (pulseRafIdRef.current) {
        cancelAnimationFrame(pulseRafIdRef.current)
      }
    }
  }, [])

  // ── Sidebar / Activity Bar State ──────────────────────────
  const [sidebarMode, setSidebarMode] = useState('explorer')
  const [fileTree, setFileTree] = useState([])

  // ── Interactive Extensions State ──────────────────────────
  const [extStates, setExtStates] = useState(() => {
    const defaultStates = {
      'fusion-copilot': true,
      'cyber-dark-pro': true,
      'prettier': true,
      'eslint': false,
      'gitlens': false,
      'error-lens': false,
      'python-pack': false,
      'go-tools': false,
      'rust-analyzer': false,
      'dracula': false,
      'one-dark-pro': false,
    }
    try {
      const saved = localStorage.getItem('cf_ext_states')
      if (saved) return JSON.parse(saved)
    } catch { }
    return defaultStates
  })

  const [installing, setInstalling] = useState(null)
  const [activeTheme, setActiveTheme] = useState('cyber-dark-pro') // default active installed theme

  // ── Interactive Terminal Shell State ──────────────────────
  const [terminalLines, setTerminalLines] = useState([
    'Codefusion Interactive Shell v1.2.0.',
    'Type "help" to view all simulated workspace & Git commands.',
    ''
  ])
  const [terminalInput, setTerminalInput] = useState('')
  const terminalEndRef = useRef(null)

  // ── Interactive Git / Source Control State ──────────────────
  const [gitCommits, setGitCommits] = useState(() => {
    const defaultCommits = [
      {
        hash: '6b8a2c1',
        message: 'feat: integrate Yjs collaboration room for real-time multiplayer editing',
        author: 'Alice Cooper',
        email: 'alice@codefusion.io',
        date: '2026-06-20T16:15:00Z',
        branch: 'main',
        track: 0,
        parents: ['bf5c3d2'],
        files: [
          { path: 'client/src/components/EditorView.jsx', status: 'modified', additions: 142, deletions: 18 },
          { path: 'server/src/sockets/collab.js', status: 'added', additions: 89, deletions: 0 }
        ]
      },
      {
        hash: 'bf5c3d2',
        message: 'fix: resolved cursor position displacement on concurrent edits',
        author: 'Bob Ross',
        email: 'bob@codefusion.io',
        date: '2026-06-20T14:30:00Z',
        branch: 'main',
        track: 0,
        parents: ['3a4f9e0'],
        files: [
          { path: 'client/src/components/EditorView.jsx', status: 'modified', additions: 12, deletions: 9 }
        ]
      },
      {
        hash: '3a4f9e0',
        message: 'feat: added auto-save status and Supabase persistence',
        author: 'Alice Cooper',
        email: 'alice@codefusion.io',
        date: '2026-06-19T18:45:00Z',
        branch: 'main',
        track: 0,
        parents: ['9e8d7c6'],
        files: [
          { path: 'client/src/api/auth.js', status: 'modified', additions: 55, deletions: 12 },
          { path: 'client/src/components/EditorView.jsx', status: 'modified', additions: 44, deletions: 4 }
        ]
      },
      {
        hash: '9e8d7c6',
        message: "merge: branch 'bugfix/auth' into 'main'",
        author: 'Alice Cooper',
        email: 'alice@codefusion.io',
        date: '2026-06-19T11:00:00Z',
        branch: 'main',
        track: 0,
        parents: ['1a2b3c4', 'f7e6d5c'],
        files: [
          { path: 'client/src/pages/LoginPage.jsx', status: 'modified', additions: 2, deletions: 2 }
        ]
      },
      {
        hash: '1a2b3c4',
        message: 'fix: session token refresh and redirection logic',
        author: 'Bob Ross',
        email: 'bob@codefusion.io',
        date: '2026-06-19T09:15:00Z',
        branch: 'bugfix/auth',
        track: 1,
        parents: ['f7e6d5c'],
        files: [
          { path: 'client/src/store/authStore.js', status: 'modified', additions: 28, deletions: 14 }
        ]
      },
      {
        hash: 'f7e6d5c',
        message: 'feat: integrate Piston compiler/sandbox API for multi-language execution',
        author: 'Alice Cooper',
        email: 'alice@codefusion.io',
        date: '2026-06-18T15:20:00Z',
        branch: 'main',
        track: 0,
        parents: ['a1b2c3d'],
        files: [
          { path: 'server/src/routes/sandbox.js', status: 'added', additions: 110, deletions: 0 },
          { path: 'client/src/components/EditorView.jsx', status: 'modified', additions: 35, deletions: 2 }
        ]
      },
      {
        hash: 'a1b2c3d',
        message: 'feat: initial project structure, routing, and setup',
        author: 'System Admin',
        email: 'admin@codefusion.io',
        date: '2026-06-15T09:00:00Z',
        branch: 'main',
        track: 0,
        parents: [],
        files: [
          { path: 'package.json', status: 'added', additions: 45, deletions: 0 },
          { path: 'client/src/App.jsx', status: 'added', additions: 66, deletions: 0 },
          { path: 'client/index.html', status: 'added', additions: 20, deletions: 0 }
        ]
      }
    ]
    try {
      const saved = localStorage.getItem('cf_git_commits')
      if (saved) return JSON.parse(saved)
    } catch { }
    return defaultCommits
  })

  // Simulated repository states
  const [stagedFiles, setStagedFiles] = useState([])
  const [unstagedFiles, setUnstagedFiles] = useState(['client/src/components/EditorView.jsx', 'README.md'])
  const [commitMsg, setCommitMsg] = useState('')

  // ── Monaco Editor Refs & Blames ───────────────────────────
  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const blameDecorationsRef = useRef([])
  const cursorListenerRef = useRef(null)

  // ── Collaboration State ───────────────────────────────────────
  const yDocRef = useRef(null)
  const yTextsRef = useRef(new Map())
  const awarenessRef = useRef(null)
  const socketRef = useRef(null)
  const bindingRef = useRef(null)
  const hasSyncedRef = useRef(false)

  // ── AI Chat State ──────────────────────────────────────────
  const [aiPrompt, setAiPrompt] = useState('')
  const [mode, setMode] = useState('chat')
  const [aiChat, setAiChat] = useState([
    { role: 'assistant', content: 'Hello! I can **explain**, **fix bugs**, **complete** your code, or just chat. Ask me anything.' },
  ])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  // ── Artifact comments keyed by `${chatIndex}` ──────────────
  const [artifactComments, setArtifactComments] = useState({})
  const handleArtifactComment = useCallback((chatIdx, comment) => {
    setArtifactComments(prev => ({
      ...prev,
      [chatIdx]: [...(prev[chatIdx] || []), comment],
    }))
  }, [])

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [terminalLines])

  // Helper to add lines to terminal
  const appendTerminalLines = (lines) => {
    setTerminalLines(prev => [...prev, ...lines, ''])
  }

  // ── Load from LocalStorage on project change ──────────────
  useEffect(() => {
    if (!project?.id) return
    const key = `cf_codes_${project.id}`
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        setFileCodes(prev => ({ ...parsed, ...prev }))
        fileCodesRef.current = { ...parsed }
      }
    } catch { /* ignore */ }
  }, [project?.id])

  // ── Best-effort Supabase load ─────────────────────────────
  useEffect(() => {
    if (!project?.id) return
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.id)
    if (!isUuid) return
    loadProjectFiles(project.id).then(saved => {
      if (Object.keys(saved).length > 0) {
        setFileCodes(prev => ({ ...saved, ...prev }))
        fileCodesRef.current = { ...saved }
      }
    }).catch(() => { /* silently ignore */ })
  }, [project?.id])

  useEffect(() => {
    hasSyncedRef.current = false
    const doc = new Y.Doc()
    const awareness = new awarenessProtocol.Awareness(doc)

    const colors = ['#8ed5ff', '#ffb2b7', '#10B981', '#38BDF8', '#F43F5E', '#ffb4ab']
    const myColor = colors[Math.floor(Math.random() * colors.length)]
    const myName = profile?.username || user?.email?.split('@')[0] || 'Guest'
    awareness.setLocalStateField('user', { name: myName, color: myColor })

    yDocRef.current = doc
    yTextsRef.current = new Map()
    awarenessRef.current = awareness

    const socket = io('http://localhost:5001')
    socketRef.current = socket

    const roomId = project?.id || 'default-room'
    socket.emit('join-room', roomId)

    const stateVector = Y.encodeStateVector(doc)
    socket.emit('yjs-req-state', { roomId, stateVector: Array.from(stateVector) })

    socket.on('yjs-req-state', ({ stateVector: remoteVectorArray }) => {
      const remoteVector = new Uint8Array(remoteVectorArray)
      const update = Y.encodeStateAsUpdate(doc, remoteVector)
      socket.emit('yjs-update', { roomId, update: Array.from(update) })
    })

    doc.on('update', (update, origin) => {
      if (origin !== 'remote') {
        socket.emit('yjs-update', { roomId, update: Array.from(update) })
      }
    })

    socket.on('yjs-update', (updateArray) => {
      const update = new Uint8Array(updateArray)
      Y.applyUpdate(doc, update, 'remote')
    })

    let isFirstUser = false
    socket.on('room-info', ({ isFirst }) => {
      isFirstUser = isFirst
    })

    socket.on('yjs-history', (updates) => {
      updates.forEach(updateArray => {
        const update = new Uint8Array(updateArray)
        Y.applyUpdate(doc, update, 'remote')
      })
      hasSyncedRef.current = true
    })

    // Synchronize file tree state
    const yTree = doc.getArray('project-file-tree')
    yTree.observe(() => {
      const remoteTree = yTree.toJSON()
      if (remoteTree && remoteTree.length > 0) {
        setFileTree(remoteTree)
        try { localStorage.setItem(`cf_tree_${roomId}`, JSON.stringify(remoteTree)) } catch {}
      }
    })

    // If room is new/empty, ONLY the first user to connect should initialize it.
    // This prevents duplicate root folders when multiple users connect.
    setTimeout(() => {
      if (isFirstUser && yTree.length === 0) {
        const isOwner = !project?.owner_id || project?.owner_id === user?.id
        if (isOwner) {
          const localTreeStr = localStorage.getItem(`cf_tree_${roomId}`)
          let localTree = null
          if (localTreeStr) {
            try { localTree = JSON.parse(localTreeStr) } catch {}
          }
          if (!localTree || localTree.length === 0) {
            const defaultName = project?.name || 'project'
            const defaultExt = getExtensionForLang(project?.lang)
            const rootId = 'root-' + (project?.id || 'default')
            localTree = [
              {
                id: rootId,
                name: defaultName,
                type: 'folder',
                children: [
                  { id: `file-main-${roomId}`, name: `main.${defaultExt}`, type: 'file', content: project?.code || '', lang: project?.lang || 'javascript' },
                  { id: `file-readme-${roomId}`, name: 'README.md', type: 'file', content: `# ${defaultName}\n\nA Codefusion project.\n`, lang: 'markdown' },
                ],
              }
            ]
          }
          doc.transact(() => {
            yTree.insert(0, localTree)
          })
        }
      } else {
        setFileTree(yTree.toJSON())
      }
      hasSyncedRef.current = true
    }, 300)

    awareness.on('update', ({ added, updated, removed }, origin) => {
      if (origin !== 'remote') {
        const update = awarenessProtocol.encodeAwarenessUpdate(awareness, added.concat(updated, removed))
        socket.emit('awareness-update', { roomId, update: Array.from(update) })
      }
    })

    socket.on('awareness-update', (updateArray) => {
      const update = new Uint8Array(updateArray)
      awarenessProtocol.applyAwarenessUpdate(awareness, update, 'remote')
    })

    return () => {
      socket.disconnect()
      bindingRef.current?.destroy()
      bindingRef.current = null
      awareness.destroy()
      doc.destroy()
      yTextsRef.current.clear()
    }
  }, [project?.id])

  const handleEditorBeforeMount = (monaco) => {
    // Register Dracula Theme
    monaco.editor.defineTheme('dracula', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff79c6' },
        { token: 'identifier', foreground: 'f8f8f2' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'type', foreground: '8be9fd' },
        { token: 'class', foreground: '50fa7b' },
      ],
      colors: {
        'editor.background': '#282a36',
        'editor.foreground': '#f8f8f2',
        'editorLineNumber.foreground': '#6272a4',
        'editor.lineHighlightBackground': '#44475a30',
        'editor.selectionBackground': '#44475a80',
      }
    })

    // Register Cyber Dark Theme
    monaco.editor.defineTheme('cyber-dark-pro', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '555555', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'F43F5E' },
        { token: 'identifier', foreground: 'e5e2e1' },
        { token: 'string', foreground: '10B981' },
        { token: 'number', foreground: '38BDF8' },
        { token: 'type', foreground: 'ffb2b7' },
      ],
      colors: {
        'editor.background': '#000000',
        'editor.foreground': '#e5e2e1',
        'editorLineNumber.foreground': '#3a3939',
        'editor.lineHighlightBackground': '#1c1b1b',
        'editor.selectionBackground': 'rgba(142,213,255,0.2)',
      }
    })

    // Register One Dark Theme
    monaco.editor.defineTheme('one-dark-pro', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c678dd' },
        { token: 'identifier', foreground: 'abb2bf' },
        { token: 'string', foreground: '98c379' },
        { token: 'number', foreground: 'd19a66' },
        { token: 'type', foreground: 'e5c07b' },
      ],
      colors: {
        'editor.background': '#282c34',
        'editor.foreground': '#abb2bf',
        'editorLineNumber.foreground': '#4b5263',
        'editor.lineHighlightBackground': '#2c313c80',
        'editor.selectionBackground': '#3e4451',
      }
    })
  }

  // Custom theme registrations and GitLens cursors trigger on editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Blame decorations handler (GitLens feature)
    const onCursorChange = (e) => {
      if (!extStates['gitlens']) {
        if (blameDecorationsRef.current.length > 0) {
          editor.deltaDecorations(blameDecorationsRef.current, [])
          blameDecorationsRef.current = []
        }
        return
      }

      const line = e.position.lineNumber
      const authors = ['Alice Cooper', 'Bob Ross', 'System Admin']
      const times = ['2 hours ago', '1 day ago', '3 days ago', '5 days ago']
      const logs = [
        'feat: Yjs multiplayer sync',
        'fix: solved cursor position displacement',
        'feat: added auto-save status and Supabase persistence',
        'fix: session token refresh and redirection logic',
        'feat: initial project structure'
      ]

      const author = authors[line % authors.length]
      const time = times[line % times.length]
      const log = logs[line % logs.length]

      const decoration = {
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          after: {
            content: `  • ${author}, ${time} | ${log}`,
            inlineClassName: 'monaco-git-blame-inline'
          }
        }
      }

      blameDecorationsRef.current = editor.deltaDecorations(blameDecorationsRef.current, [decoration])
    }

    if (cursorListenerRef.current) cursorListenerRef.current.dispose()
    cursorListenerRef.current = editor.onDidChangeCursorPosition(onCursorChange)

    // Check if Error Lens is installed, add ESLint warnings at line 4
    if (extStates['error-lens']) {
      editor.deltaDecorations([], [{
        range: new monaco.Range(4, 1, 4, 1),
        options: {
          isWholeLine: false,
          after: {
            content: `   ⚠️  warning: 'C' is defined but never used [eslint]`,
            inlineClassName: 'text-amber-500 italic ml-4 text-[11px] font-mono pointer-events-none'
          }
        }
      }])
    }

    if (!activeFile) return
    if (bindingRef.current) { bindingRef.current.destroy(); bindingRef.current = null }
    if (!yDocRef.current || !awarenessRef.current) return

    const fileId = activeFile.id
    let yText = yTextsRef.current.get(fileId)

    if (!yText) {
      yText = yDocRef.current.getText(`file-${fileId}`)
      yTextsRef.current.set(fileId, yText)

      // Use a short delay to check if the Yjs doc receives sync updates from other peers
      // before inserting the default local content. This prevents text duplication.
      setTimeout(() => {
        if (yText.length === 0) {
          const initialContent = fileCodesRef.current[fileId] ?? activeFile.content ?? ''
          if (initialContent) {
            yText.insert(0, initialContent)
          }
        }
      }, 200)
    }

    bindingRef.current = new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      awarenessRef.current
    )
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCode(project?.code || '') }, [project?.id, project?.code])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'auto' }) }, [aiChat, aiLoading])

  const handleTreeChange = useCallback((newTree) => {
    setFileTree(newTree)
    if (!hasSyncedRef.current) return
    if (yDocRef.current) {
      const yTree = yDocRef.current.getArray('project-file-tree')
      const currentVal = yTree.toJSON()
      if (JSON.stringify(currentVal) !== JSON.stringify(newTree)) {
        yDocRef.current.transact(() => {
          yTree.delete(0, yTree.length)
          yTree.insert(0, newTree)
        })
      }
    }
  }, [])

  const currentCode = activeFile ? (fileCodes[activeFile.id] ?? activeFile.content ?? '') : code
  const currentLang = activeFile?.lang || project?.lang || 'javascript'

  const handleCodeChange = useCallback((val) => {
    if (activeFile) {
      setFileCodes(prev => {
        const next = { ...prev, [activeFile.id]: val }
        fileCodesRef.current = next
        try { localStorage.setItem(`cf_codes_${project?.id || 'default'}`, JSON.stringify(next)) } catch { /* quota */ }
        return next
      })
      setFileTree(prevTree => {
        const updateContent = (nodes) => nodes.map(n => {
          if (n.id === activeFile.id) return { ...n, content: val }
          if (n.children) return { ...n, children: updateContent(n.children) }
          return n
        })
        const updated = updateContent(prevTree)
        try { localStorage.setItem(`cf_tree_${project?.id || 'default'}`, JSON.stringify(updated)) } catch { /* quota */ }
        return updated
      })
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setSaveStatus('saving')
      const snapFile = { ...activeFile }
      const snapVal = val
      saveTimerRef.current = setTimeout(async () => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project?.id || '')
        if (isUuid) {
          try {
            await upsertFile(project?.id, snapFile.id, snapFile.name, snapVal)
          } catch { /* silent */ }
        }
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }, 800)
    } else {
      setCode(val)
      onCodeChange?.(val)
    }
  }, [activeFile, project?.id, fileCodes])

  const handleFileSelect = useCallback((node) => {
    setActiveFile(node)
    setOpenTabs(prev => {
      if (prev.find(t => t.id === node.id)) return prev
      return [...prev, { id: node.id, name: node.name, lang: node.lang }]
    })
  }, [])

  const closeTab = useCallback((id, e) => {
    e.stopPropagation()
    setOpenTabs(prev => {
      const next = prev.filter(t => t.id !== id)
      if (activeFile?.id === id) {
        setActiveFile(next.length > 0 ? openTabs.find(t => t.id !== id) || null : null)
      }
      return next
    })
  }, [activeFile, openTabs])

  const handleRun = useCallback(async () => {
    setRunning(true)
    appendTerminalLines(['⏳ Sandbox executing compiler environment...'])
    try {
      const result = await executeCode(currentCode, currentLang)
      appendTerminalLines(result.split('\n'))
    } catch (err) {
      appendTerminalLines([`❌ Execution error: ${err.response?.data?.error || err.message}`])
    } finally {
      setRunning(false)
    }
  }, [currentCode, currentLang])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleRun()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleRun])

  // Prettier Formatting contribution
  const runPrettierFormat = () => {
    if (!editorRef.current) return
    const model = editorRef.current.getModel()
    if (!model) return
    const raw = model.getValue()

    let formatted = ''
    let indent = 0
    raw.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed.startsWith('}') || trimmed.startsWith(']')) {
        indent = Math.max(0, indent - 1)
      }
      formatted += '  '.repeat(indent) + trimmed + '\n'
      if (trimmed.endsWith('{') || trimmed.endsWith('[')) {
        indent++
      }
    })

    editorRef.current.setValue(formatted.trim())
    appendTerminalLines(['✨ Code formatted with Prettier rules.'])
  }

  // ── Shell Commands Executor ──────────────────────────────────
  const handleTerminalCommand = (e) => {
    if (e.key === 'Enter') {
      const cmd = terminalInput.trim()
      if (!cmd) return

      setTerminalLines(prev => [...prev, `λ ${cmd}`])
      setTerminalInput('')

      const args = cmd.split(' ')
      const command = args[0].toLowerCase()

      // Traverse tree helper
      const findFileNode = (nodes, name) => {
        for (const n of nodes) {
          if (n.name === name && n.type === 'file') return n
          if (n.children) {
            const found = findFileNode(n.children, name)
            if (found) return found
          }
        }
        return null
      }

      switch (command) {
        case 'clear':
        case 'cls':
          setTerminalLines([])
          break
        case 'help':
          appendTerminalLines([
            'Available Codefusion commands:',
            '  help               Show help menu',
            '  ls / dir           List current project folder structures',
            '  cat <file>         Print file contents in terminal console',
            '  prettier           Format active document (Prettier formatter required)',
            '  git status         Display working directory state',
            '  git add <file>     Stage file edits for commit',
            '  git commit -m <m>  Create git repository commit',
            '  git log            Inspect commit history logs',
            '  git diff           Show unstaged line adjustments',
            '  node / python / run Run code inside secure compile sandbox',
            '  clear / cls        Flush shell terminal output'
          ])
          break
        case 'ls':
        case 'dir':
          const filesList = ['Workspace tree:']
          const traverse = (nodes, space = '') => {
            nodes.forEach(n => {
              if (n.type === 'folder') {
                filesList.push(`${space}📁 ${n.name}/`)
                traverse(n.children || [], space + '  ')
              } else {
                filesList.push(`${space}📄 ${n.name}`)
              }
            })
          }
          traverse(fileTree)
          appendTerminalLines(filesList)
          break
        case 'cat':
          if (!args[1]) {
            appendTerminalLines(['Usage: cat <filename>'])
          } else {
            const node = findFileNode(fileTree, args[1])
            if (node) {
              const content = fileCodes[node.id] ?? node.content ?? ''
              appendTerminalLines(content.split('\n'))
            } else {
              appendTerminalLines([`Error: file '${args[1]}' not found.`])
            }
          }
          break
        case 'prettier':
          if (!extStates['prettier']) {
            appendTerminalLines(['Error: Prettier extension is not installed.'])
          } else {
            runPrettierFormat()
          }
          break
        case 'node':
        case 'python':
        case 'run':
          handleRun()
          break
        case 'git':
          const gitAction = args[1]?.toLowerCase()
          if (gitAction === 'status') {
            appendTerminalLines([
              'On branch main',
              stagedFiles.length > 0 ? 'Changes to be committed:' : 'No files staged.',
              ...stagedFiles.map(f => `\tstaged:   ${f}`),
              unstagedFiles.length > 0 ? 'Changes not staged for commit:' : 'No unstaged edits.',
              ...unstagedFiles.map(f => `\tmodified: ${f}`),
            ])
          } else if (gitAction === 'add') {
            const fName = args[2]
            if (!fName) {
              appendTerminalLines(['Specify file name or "." to add all.'])
            } else if (fName === '.') {
              setStagedFiles(prev => [...prev, ...unstagedFiles])
              setUnstagedFiles([])
              appendTerminalLines([`Staged ${unstagedFiles.length} files.`])
            } else {
              if (unstagedFiles.includes(fName)) {
                setStagedFiles(prev => [...prev, fName])
                setUnstagedFiles(prev => prev.filter(f => f !== fName))
                appendTerminalLines([`Staged ${fName}.`])
              } else {
                appendTerminalLines([`File '${fName}' not modified or already staged.`])
              }
            }
          } else if (gitAction === 'commit') {
            const mIdx = cmd.indexOf('-m')
            let msg = ''
            if (mIdx !== -1) {
              msg = cmd.substring(mIdx + 2).trim().replace(/^["']|["']$/g, '')
            }
            if (!msg) {
              appendTerminalLines(['Usage: git commit -m "commit message"'])
            } else if (stagedFiles.length === 0) {
              appendTerminalLines(['nothing to commit, working tree clean'])
            } else {
              const hash = Math.random().toString(16).substring(2, 9)
              const newC = {
                hash,
                message: msg,
                author: profile?.username || user?.email?.split('@')[0] || 'You',
                email: user?.email || 'dev@codefusion.io',
                date: new Date().toISOString(),
                branch: 'main',
                track: 0,
                parents: [gitCommits[0]?.hash || ''],
                files: stagedFiles.map(f => ({ path: f, status: 'modified', additions: 18, deletions: 4 }))
              }
              setGitCommits(prev => {
                const updated = [newC, ...prev]
                localStorage.setItem('cf_git_commits', JSON.stringify(updated))
                return updated
              })
              setStagedFiles([])
              appendTerminalLines([
                `[main ${hash}] ${msg}`,
                ` ${stagedFiles.length} files changed, 18 insertions(+), 4 deletions(-)`
              ])
            }
          } else if (gitAction === 'log') {
            const logList = []
            gitCommits.forEach(c => {
              logList.push(`commit ${c.hash}`)
              logList.push(`Author: ${c.author} <${c.email}>`)
              logList.push(`Date:   ${c.date}`)
              logList.push(``)
              logList.push(`    ${c.message}`)
              logList.push(``)
            })
            appendTerminalLines(logList)
          } else if (gitAction === 'diff') {
            if (unstagedFiles.length === 0) {
              appendTerminalLines(['Working tree clean.'])
            } else {
              const diffLines = []
              unstagedFiles.forEach(f => {
                diffLines.push(`diff --git a/${f} b/${f}`)
                diffLines.push(`--- a/${f}`)
                diffLines.push(`+++ b/${f}`)
                diffLines.push(`@@ -14,6 +14,7 @@`)
                diffLines.push(`-  const test = 10;`)
                diffLines.push(`+  const test = 20;`)
              })
              appendTerminalLines(diffLines)
            }
          } else {
            appendTerminalLines(['git commands: status, add, commit, log, diff'])
          }
          break
        default:
          appendTerminalLines([`command not found: ${command}`])
      }
    }
  }

  // ── Extensions Install sync ──────────────────────────────────
  const handleToggleInstall = (id) => {
    setInstalling(id)
    setTimeout(() => {
      setExtStates(prev => {
        const next = { ...prev, [id]: !prev[id] }
        localStorage.setItem('cf_ext_states', JSON.stringify(next))

        // Auto apply theme on theme install
        if (id === 'dracula') {
          setActiveTheme(next[id] ? 'dracula' : 'vs-dark')
        } else if (id === 'cyber-dark-pro') {
          setActiveTheme(next[id] ? 'cyber-dark-pro' : 'vs-dark')
        } else if (id === 'one-dark-pro') {
          setActiveTheme(next[id] ? 'one-dark-pro' : 'vs-dark')
        }
        return next
      })
      setInstalling(null)
    }, 900)
  }

  // Opening Git Graph or Extension details as Editor tabs
  const handleSelectExtensionDetail = (ext) => {
    const tabId = `ext-${ext.id}`
    const detailTab = {
      id: tabId,
      name: `Extension: ${ext.name}`,
      isExtensionDetail: true,
      extensionData: ext,
    }
    setOpenTabs(prev => {
      if (prev.find(t => t.id === tabId)) return prev
      return [...prev, detailTab]
    })
    setActiveFile(detailTab)
  }

  const openGitGraphTab = () => {
    const tabId = 'gitgraph'
    const graphTab = {
      id: tabId,
      name: 'Git Graph',
      isGitGraph: true
    }
    setOpenTabs(prev => {
      if (prev.find(t => t.id === tabId)) return prev
      return [...prev, graphTab]
    })
    setActiveFile(graphTab)
  }

  const handleSelectSymbol = (sym) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(sym.line)
      editorRef.current.setPosition({ lineNumber: sym.line, column: 1 })
      editorRef.current.focus()
    }
  }

  const handleAiSubmit = async (e) => {
    e.preventDefault()
    const text = aiPrompt.trim()
    if ((!text && mode === 'chat') || aiLoading) return

    const effectivePrompt = text ||
      (mode === 'explain' ? 'Explain this code' :
        mode === 'fix' ? 'Find and fix all bugs' :
          'Complete the code')

    const shouldTriggerVeins = mode === 'fix' || effectivePrompt.toLowerCase().includes('fix the bug') || effectivePrompt.toLowerCase().includes('fix')

    const userMsg = { role: 'user', content: effectivePrompt }
    setAiChat(prev => [...prev, userMsg])
    setAiPrompt('')
    setAiLoading(true)
    setAiError('')

    if (shouldTriggerVeins) {
      setTimeout(() => {
        triggerVeinAnimation()
      }, 100)
    }

    const history = aiChat.slice(1).map(m => ({ role: m.role, content: m.content }))

    try {
      const { reply } = await sendAiChat({
        prompt: effectivePrompt,
        code: currentCode,
        language: currentLang,
        history,
        mode,
      })
      const artifact = deriveArtifactFromReply({ mode, prompt: effectivePrompt, reply })
      setAiChat(prev => [...prev, { role: 'assistant', content: reply, artifact }])
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Something went wrong'
      setAiError(errMsg)
      setAiChat(prev => [...prev, { role: 'assistant', content: `⚠️ ${errMsg}` }])
    } finally {
      setAiLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleModeAction = async (newMode) => {
    setMode(newMode)
    if (newMode === 'explain' || newMode === 'fix') {
      setAiLoading(true)
      setAiError('')
      const prompt = newMode === 'explain' ? 'Explain this code' : 'Find and fix all bugs'
      const userMsg = { role: 'user', content: prompt }
      setAiChat(prev => [...prev, userMsg])

      if (newMode === 'fix') {
        setTimeout(() => {
          triggerVeinAnimation()
        }, 100)
      }

      try {
        const history = aiChat.slice(1).map(m => ({ role: m.role, content: m.content }))
        const { reply } = await sendAiChat({ prompt, code: currentCode, language: currentLang, history, mode: newMode })
        const artifact = deriveArtifactFromReply({ mode: newMode, prompt, reply })
        setAiChat(prev => [...prev, { role: 'assistant', content: reply, artifact }])
      } catch (err) {
        setAiError(err.response?.data?.error || err.message || 'Something went wrong')
      } finally {
        setAiLoading(false)
      }
    }
  }

  return (
    <div className="bg-background text-on-surface font-body-sm overflow-hidden h-screen flex flex-col relative">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 w-full h-1 pointer-events-none z-[100] bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse" />

      <header className="bg-surface/80 backdrop-blur-md text-primary font-headline-md text-headline-md fixed top-0 w-full border-b border-glass-border shadow-[0_0_8px_rgba(142,213,255,0.2)] flex items-center justify-between px-gutter h-14 z-50">
        <div
          className="flex items-center gap-stack-md cursor-pointer group"
          onClick={() => onNavigate('dashboard')}
          title="Go to Dashboard"
        >
          <div className="w-[38px] h-[38px] rounded-full border-2 border-white/85 flex items-center justify-center bg-primary/10 shadow-[0_0_12px_rgba(142,213,255,0.25)] group-hover:shadow-[0_0_20px_rgba(142,213,255,0.5)] group-hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
          </div>
          <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">Codefusion <span className="font-normal text-on-surface-variant">Editor</span></h1>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex gap-gutter font-label-caps text-label-caps">
            <a onClick={() => onNavigate('dashboard')} className="text-on-surface-variant hover:text-neon-blue transition-colors cursor-pointer">Projects</a>
            <a className="text-primary hover:text-neon-blue transition-colors cursor-pointer">Editor</a>
            <a onClick={() => onNavigate('chat')} className="text-on-surface-variant hover:text-neon-blue transition-colors cursor-pointer">Chat</a>
          </nav>
          <div className="h-6 w-px bg-glass-border"></div>
          <div className="flex items-center gap-stack-sm">
            {TEAM.map((member, i) => (
              <div key={i} className={`w-8 h-8 rounded-full border-2 ${member.color} p-0.5 overflow-hidden flex items-center justify-center bg-surface-bright text-xs font-bold text-on-surface`}>
                {member.initial}
              </div>
            ))}
            <button className="ml-2 bg-primary text-on-primary px-4 py-1 rounded-full font-label-caps text-label-caps hover:brightness-110 active:scale-95 transition-all flex items-center gap-1">
              INVITE
            </button>
          </div>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant cursor-pointer active:scale-95">sensors</span>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 flex mt-14 overflow-hidden">

        {/* Activity Bar + Left Side Explorer */}
        <div className="hidden lg:flex h-full" style={{ position: 'relative' }}>
          {/* ── Activity Bar ── */}
          <div style={{
            width: 48, height: '100%',
            background: C.voidBlack,
            borderRight: `1px solid ${C.glassBorder}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: 8, gap: 2, zIndex: 41, flexShrink: 0,
          }}>
            {[
              { id: 'explorer', icon: 'account_tree', title: 'Explorer' },
              { id: 'search', icon: 'search', title: 'Search' },
              { id: 'git', icon: 'commit', title: 'Source Control' },
              { id: 'extensions', icon: 'extension', title: 'Extensions' },
              { id: 'outline', icon: 'schema', title: 'Outline' },
            ].map(({ id, icon, title }) => {
              const active = sidebarMode === id
              return (
                <button
                  key={id}
                  title={title}
                  onClick={() => setSidebarMode(prev => prev === id ? null : id)}
                  style={{
                    width: 40, height: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? 'rgba(142,213,255,0.1)' : 'none',
                    border: 'none', borderRadius: 8,
                    borderLeft: active ? `2px solid ${C.primary}` : '2px solid transparent',
                    cursor: 'pointer',
                    color: active ? C.primary : C.onSurfaceVar,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = C.onSurface } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.onSurfaceVar } }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: `'FILL' ${active ? 1 : 0},'wght' 400,'GRAD' 0,'opsz' 24` }}>
                    {icon}
                  </span>
                </button>
              )
            })}

            <div style={{ flex: 1 }} />

            <button
              title="Settings"
              style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: C.onSurfaceVar, marginBottom: 8, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = C.onSurface }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.onSurfaceVar }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>settings</span>
            </button>
          </div>

          {/* Sliding Sidebar Panel */}
          <aside
            style={{
              width: sidebarMode ? 240 : 0,
              minWidth: sidebarMode ? 240 : 0,
              maxWidth: sidebarMode ? 240 : 0,
              height: '100%',
              background: C.surfaceContLow,
              borderRight: sidebarMode ? `1px solid ${C.glassBorder}` : 'none',
              overflow: 'hidden',
              transition: 'width 0.2s ease, min-width 0.2s ease, max-width 0.2s ease',
              display: 'flex', flexDirection: 'column',
              zIndex: 40,
            }}
          >
            <div style={{ width: 240, height: '100%', display: 'flex', flexDirection: 'column', paddingTop: 12, overflow: 'hidden' }}>
              {sidebarMode === 'explorer' && (
                <>
                  <FileExplorer
                    project={project}
                    activeFileId={activeFile?.id}
                    onFileSelect={handleFileSelect}
                    onTreeChange={handleTreeChange}
                    tree={fileTree}
                  />
                  <div className="mt-auto px-4 pt-4 border-t border-glass-border flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-container/10 flex items-center justify-center rounded-lg border border-primary/20">
                        <span className="material-symbols-outlined text-primary">terminal</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-body-sm text-on-surface">{project?.ownerName || 'Lead Dev'}</span>
                        <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">codefusion / main</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {sidebarMode === 'search' && (
                <SearchPanel
                  tree={fileTree}
                  fileCodes={fileCodes}
                  onFileSelect={handleFileSelect}
                />
              )}
              {sidebarMode === 'extensions' && (
                <ExtensionsPanel
                  onSelectExtension={handleSelectExtensionDetail}
                  onToggleInstall={handleToggleInstall}
                  installing={installing}
                  extStates={extStates}
                />
              )}
              {sidebarMode === 'git' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 12px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.primary, marginBottom: 12 }}>
                    <Icon name="commit" size={18} color={C.primary} />
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>SOURCE CONTROL</span>
                  </div>

                  <button
                    onClick={openGitGraphTab}
                    style={{
                      width: '100%', padding: '6px 12px', background: C.surfaceContHigh,
                      color: C.primary, border: `1px solid ${C.glassBorder}`, borderRadius: 6,
                      fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700,
                      cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <Icon name="monitoring" size={13} color={C.primary} /> OPEN GIT GRAPH
                  </button>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Commit input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <textarea
                        value={commitMsg}
                        onChange={e => setCommitMsg(e.target.value)}
                        placeholder="Commit message (Ctrl+Enter to commit)..."
                        style={{
                          width: '100%', height: 60, background: C.voidBlack, color: C.onSurface,
                          border: `1px solid ${C.glassBorder}`, borderRadius: 6, padding: 6,
                          fontSize: 11, fontFamily: 'JetBrains Mono', outline: 'none', resize: 'none'
                        }}
                      />
                      <button
                        onClick={() => {
                          if (!commitMsg.trim()) return
                          const hash = Math.random().toString(16).substring(2, 9)
                          const newC = {
                            hash,
                            message: commitMsg,
                            author: profile?.username || user?.email?.split('@')[0] || 'You',
                            email: user?.email || 'dev@codefusion.io',
                            date: new Date().toISOString(),
                            branch: 'main',
                            track: 0,
                            parents: [gitCommits[0]?.hash || ''],
                            files: stagedFiles.map(f => ({ path: f, status: 'modified', additions: 10, deletions: 2 }))
                          }
                          setGitCommits(prev => {
                            const updated = [newC, ...prev]
                            localStorage.setItem('cf_git_commits', JSON.stringify(updated))
                            return updated
                          })
                          setStagedFiles([])
                          setCommitMsg('')
                          appendTerminalLines([`[main ${hash}] committed successfully from sidebar.`])
                        }}
                        style={{
                          width: '100%', padding: '6px 0', background: C.primary, color: C.onPrimary,
                          border: 'none', borderRadius: 6, fontSize: 10, fontFamily: 'JetBrains Mono',
                          fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        COMMIT
                      </button>
                    </div>

                    {/* Staged Changes */}
                    <div>
                      <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: C.onSurfaceVar, display: 'block', marginBottom: 6 }}>STAGED CHANGES ({stagedFiles.length})</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {stagedFiles.map(f => (
                          <div key={f} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, fontFamily: 'JetBrains Mono', color: C.matrixGreen }}>
                            <span>{f.split('/').pop()}</span>
                            <span
                              onClick={() => {
                                setUnstagedFiles(prev => [...prev, f])
                                setStagedFiles(prev => prev.filter(x => x !== f))
                              }}
                              className="material-symbols-outlined" style={{ fontSize: 14, cursor: 'pointer' }}
                            >remove_circle</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Unstaged Changes */}
                    <div>
                      <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: C.onSurfaceVar, display: 'block', marginBottom: 6 }}>MODIFIED FILES ({unstagedFiles.length})</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {unstagedFiles.map(f => (
                          <div key={f} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, fontFamily: 'JetBrains Mono', color: C.secondary }}>
                            <span>{f.split('/').pop()}</span>
                            <span
                              onClick={() => {
                                setStagedFiles(prev => [...prev, f])
                                setUnstagedFiles(prev => prev.filter(x => x !== f))
                              }}
                              className="material-symbols-outlined" style={{ fontSize: 14, cursor: 'pointer', color: C.primary }}
                            >add_circle</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {sidebarMode === 'outline' && (
                <OutlinePanel
                  code={currentCode}
                  language={currentLang}
                  onSelectSymbol={handleSelectSymbol}
                />
              )}
            </div>
          </aside>
        </div>

        {/* Center Editor Pane */}
        <section className="flex-1 flex flex-col bg-surface overflow-hidden relative" style={{ background: '#000000' }}>
          {/* Tabs Bar */}
          <div className="flex h-10 border-b border-glass-border bg-surface-container-lowest overflow-x-auto custom-scrollbar">
            {openTabs.length === 0 ? (
              <div className="flex items-center gap-2 px-4 bg-surface border-r border-glass-border border-t-2 border-t-primary text-primary font-code-sm text-code-sm cursor-pointer min-w-max">
                <span className="material-symbols-outlined text-[16px]">description</span>
                <span>main.{getExtensionForLang(project?.lang)}</span>
              </div>
            ) : openTabs.map(tab => {
              const isActiveTab = tab.id === activeFile?.id
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveFile(tab)}
                  className="flex items-center gap-2 px-3 border-r border-glass-border font-code-sm text-code-sm cursor-pointer min-w-max group transition-colors"
                  style={{
                    background: isActiveTab ? '#131313' : 'transparent',
                    borderTop: isActiveTab ? '2px solid #8ed5ff' : '2px solid transparent',
                    color: isActiveTab ? '#8ed5ff' : '#bdc8d1',
                  }}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {tab.isGitGraph ? 'monitoring' : tab.isExtensionDetail ? 'extension' : 'code'}
                  </span>
                  <span>{tab.name}</span>
                  <span
                    onClick={e => closeTab(tab.id, e)}
                    className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity ml-1"
                  >close</span>
                </div>
              )
            })}
            {saveStatus !== 'idle' && activeFile && !activeFile.isGitGraph && !activeFile.isExtensionDetail && (
              <div style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
                padding: '0 12px', flexShrink: 0,
                fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
                color: saveStatus === 'saved' ? '#10B981' : saveStatus === 'error' ? '#F43F5E' : '#bdc8d1',
                opacity: 0.8,
              }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 13,
                    animation: saveStatus === 'saving' ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  {saveStatus === 'saved' ? 'cloud_done' : saveStatus === 'error' ? 'cloud_off' : 'sync'}
                </span>
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save failed'}
              </div>
            )}
          </div>

          {/* Editor Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {openTabs.length === 0 && !activeFile ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ background: '#000000' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'rgba(142,213,255,0.15)' }}>code</span>
                <p style={{ color: 'rgba(189,200,209,0.4)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>Select a file from the Explorer to start editing</p>
              </div>
            ) : activeFile?.isGitGraph ? (
              <GitGraphView commits={gitCommits} onCloseTab={(e) => closeTab('gitgraph', e)} />
            ) : activeFile?.isExtensionDetail ? (
              <ExtensionDetailView
                extension={activeFile.extensionData}
                onToggleInstall={handleToggleInstall}
                installing={installing}
              />
            ) : (
              <Editor
                height="100%"
                key={activeFile?.id || 'default'}
                language={currentLang}
                theme={activeTheme}
                defaultValue={currentCode}
                onChange={handleCodeChange}
                beforeMount={handleEditorBeforeMount}
                onMount={handleEditorDidMount}
                options={{
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, monospace',
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  renderLineHighlight: 'all',
                }}
              />
            )}
          </div>

          {/* Bottom Terminal Pane */}
          <div className="bg-void-black border-t border-glass-border flex flex-col font-code-sm" style={{ height: terminalHeight }}>
            <div className="flex items-center justify-between px-4 h-8 bg-surface-container-low border-b border-glass-border">
              <div className="flex items-center gap-4 h-full">
                <span className="text-primary font-label-caps text-label-caps border-b-2 border-primary h-full flex items-center px-2">TERMINAL</span>
                <span className="text-on-surface-variant/40 font-label-caps text-label-caps h-full flex items-center px-2 hover:text-on-surface cursor-pointer">DEBUG CONSOLE</span>
                <span className="text-on-surface-variant/40 font-label-caps text-label-caps h-full flex items-center px-2 hover:text-on-surface cursor-pointer">OUTPUT</span>
              </div>
              <div className="flex gap-2">
                {extStates['prettier'] && activeFile && !activeFile.isGitGraph && !activeFile.isExtensionDetail && (
                  <button onClick={runPrettierFormat} className="flex items-center gap-1 px-2 py-0.5 bg-matrix-green/15 hover:bg-matrix-green/25 text-matrix-green font-label-caps text-label-caps rounded transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[12px]">auto_fix_high</span>
                    FORMAT
                  </button>
                )}
                <button onClick={handleRun} disabled={running} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary font-label-caps text-label-caps rounded transition-colors disabled:opacity-50 cursor-pointer">
                  <span className="material-symbols-outlined text-[12px]">{running ? 'sync' : 'play_arrow'}</span>
                  {running ? 'RUNNING' : 'RUN'}
                </button>
                <span onClick={() => setTerminalHeight(h => h === 192 ? 320 : 192)} className="material-symbols-outlined text-[16px] text-on-surface-variant cursor-pointer hover:text-primary">
                  {terminalHeight > 192 ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
                </span>
              </div>
            </div>

            {/* Interactive Shell Terminal */}
            <div
              className="flex-1 p-4 text-code-sm overflow-y-auto custom-scrollbar flex flex-col"
              onClick={() => document.getElementById('terminal-input-prompt')?.focus()}
            >
              <div className="whitespace-pre-wrap flex-1">
                {terminalLines.map((line, i) => {
                  let color = '#bdc8d1'
                  if (/error|failed|invalid|not found/i.test(line)) color = '#F43F5E'
                  else if (/success|complete|staged|committed|added/i.test(line)) color = '#10B981'
                  else if (line.startsWith('λ') || line.startsWith('commit')) color = '#8ed5ff'
                  return <span key={i} style={{ color, display: 'block' }}>{line}</span>
                })}
                <div ref={terminalEndRef} />
              </div>

              <div className="flex gap-2 mt-2 items-center flex-shrink-0">
                <span className="text-matrix-green font-mono font-bold">λ</span>
                <input
                  id="terminal-input-prompt"
                  type="text"
                  value={terminalInput}
                  onChange={e => setTerminalInput(e.target.value)}
                  onKeyDown={handleTerminalCommand}
                  style={{ background: 'none', border: 'none', outline: 'none' }}
                  className="flex-1 text-on-surface font-mono font-bold text-code-sm caret-primary"
                  placeholder="Type a command (ls, git status, git log, prettier, run, clear)..."
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right AI Chat Pane */}
        <aside className="hidden xl:flex flex-col w-80 bg-surface-container border-l border-glass-border z-40">
          <div className="p-4 border-b border-glass-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-cyber-pink" style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
              <span className="font-headline-md text-headline-md text-on-surface">Fusion AI</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-stack-md custom-scrollbar">
            {aiChat.map((msg, idx) => (
              <div key={idx} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
                <div className={`flex items-center gap-2 text-[10px] font-bold ${msg.role === 'assistant' ? 'text-cyber-pink' : 'text-primary'}`}>
                  {msg.role === 'assistant' ? (
                    <><span className="material-symbols-outlined text-[14px]">bolt</span> AI ASSISTANT</>
                  ) : (
                    <>YOU <span className="material-symbols-outlined text-[14px]">person</span></>
                  )}
                </div>
                <div className={`text-body-sm p-3 rounded-xl ${msg.role === 'assistant'
                  ? 'glass-panel rounded-tl-none text-on-surface border-cyber-pink/20'
                  : 'bg-primary/10 border border-primary/20 rounded-tr-none text-on-surface'
                  }`}>
                  {msg.role === 'assistant' ? <AiMessage text={msg.content} /> : msg.content}
                </div>
                {/* ── Artifact card: structured, reviewable deliverable instead of raw text ── */}
                {msg.role === 'assistant' && msg.artifact && (
                  <ArtifactCard
                    artifact={msg.artifact}
                    comments={artifactComments[idx] || []}
                    onComment={(c) => handleArtifactComment(idx, c)}
                  />
                )}
              </div>
            ))}

            {aiLoading && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] text-cyber-pink font-bold">
                  <span className="material-symbols-outlined text-[14px]">bolt</span> AI ASSISTANT
                </div>
                <div id="ai-typing-indicator" className="glass-panel p-3 rounded-xl rounded-tl-none border-cyber-pink/20 flex gap-1 items-center h-10">
                  <span className="w-1.5 h-1.5 bg-cyber-pink rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-cyber-pink rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-1.5 h-1.5 bg-cyber-pink rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
              </div>
            )}

            {aiError && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-error-container/30 border border-error/30 text-[11px] text-error mt-2">
                <span className="material-symbols-outlined text-[14px]">error</span>
                <span>{aiError}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleAiSubmit} className="p-4 bg-surface-container-low border-t border-glass-border">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={aiLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAiSubmit(e)
                  }
                }}
                className="w-full bg-void-black border border-glass-border rounded-xl p-3 pr-12 text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none h-20 text-on-surface disabled:opacity-50"
                placeholder={PLACEHOLDER[mode]}
              ></textarea>
              <button
                type="submit"
                disabled={aiLoading || (!aiPrompt.trim() && mode === 'chat')}
                className="absolute bottom-3 right-3 w-8 h-8 bg-primary text-on-primary rounded-lg flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">{aiLoading ? 'sync' : 'send'}</span>
              </button>
            </div>

            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {MODES.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleModeAction(m.id)}
                  className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors border ${mode === m.id ? 'bg-surface-bright text-primary border-primary/50' : 'bg-surface-container-highest text-on-surface-variant border-glass-border hover:text-primary'
                    }`}
                >
                  <span className="material-symbols-outlined text-[12px]">{m.icon}</span> {m.label}
                </div>
              ))}
            </div>
          </form>
        </aside>

      </main>
      <svg id="veins-svg" className="fixed inset-0 pointer-events-none w-full h-full z-[100]" style={{ display: 'none', opacity: 0 }}></svg>
    </div>
  )
}