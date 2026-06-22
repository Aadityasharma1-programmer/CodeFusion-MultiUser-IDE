/* eslint-disable react-hooks/refs */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable no-unused-vars */
import { useState, useRef, useCallback, useEffect } from 'react'
import { getExtensionForLang } from '../store/projectStore'

/* ── Language detection ─────────────────────────────────── */
const EXT_MAP = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python', pyw: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  c: 'c', h: 'c',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
  cs: 'csharp',
  php: 'php',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  sh: 'shell', bash: 'shell', zsh: 'shell',
  html: 'html', htm: 'html',
  css: 'css', scss: 'scss', sass: 'scss',
  json: 'json', jsonc: 'json',
  md: 'markdown', mdx: 'markdown',
  yaml: 'yaml', yml: 'yaml',
  toml: 'ini',
  xml: 'xml',
  sql: 'sql',
  dockerfile: 'dockerfile',
  txt: 'plaintext',
}

const FILE_ICONS = {
  js:   { icon: 'terminal',          color: '#F7DF1E' },
  jsx:  { icon: 'code',              color: '#61DAFB' },
  ts:   { icon: 'code',              color: '#3178C6' },
  tsx:  { icon: 'code',              color: '#3178C6' },
  py:   { icon: 'code',              color: '#3572A5' },
  go:   { icon: 'code',              color: '#00ADD8' },
  rs:   { icon: 'code',              color: '#CE412B' },
  java: { icon: 'code',              color: '#F89820' },
  cpp:  { icon: 'code',              color: '#6295CB' },
  c:    { icon: 'code',              color: '#A8B9CC' },
  cs:   { icon: 'code',              color: '#9B4993' },
  rb:   { icon: 'code',              color: '#CC342D' },
  json: { icon: 'data_object',       color: '#F43F5E' },
  md:   { icon: 'description',       color: '#bdc8d1' },
  css:  { icon: 'style',             color: '#38BDF8' },
  scss: { icon: 'style',             color: '#CD6799' },
  html: { icon: 'html',              color: '#E34F26' },
  txt:  { icon: 'article',           color: '#bdc8d1' },
  env:  { icon: 'lock',              color: '#F43F5E' },
  yaml: { icon: 'settings',          color: '#CB171E' },
  yml:  { icon: 'settings',          color: '#CB171E' },
  toml: { icon: 'settings',          color: '#9C4221' },
  sql:  { icon: 'storage',           color: '#336791' },
  sh:   { icon: 'terminal',          color: '#10B981' },
  svg:  { icon: 'image',             color: '#FFB13B' },
  png:  { icon: 'image',             color: '#8ed5ff' },
  jpg:  { icon: 'image',             color: '#8ed5ff' },
  jpeg: { icon: 'image',             color: '#8ed5ff' },
  gif:  { icon: 'image',             color: '#8ed5ff' },
  lock: { icon: 'lock',              color: '#e5e2e1' },
  dockerfile: { icon: 'view_in_ar',  color: '#2496ED' },
}

const FOLDER_COLORS = {
  src:       '#38BDF8',
  components:'#F43F5E',
  pages:     '#A855F7',
  api:       '#10B981',
  hooks:     '#F59E0B',
  utils:     '#6366F1',
  styles:    '#EC4899',
  assets:    '#F97316',
  public:    '#14B8A6',
  tests:     '#EF4444',
  __tests__: '#EF4444',
  node_modules: '#3a3939',
  '.git':    '#3a3939',
}

function getFileIcon(name) {
  const lower = name.toLowerCase()
  // Special filenames
  if (lower === 'dockerfile') return { icon: 'view_in_ar', color: '#2496ED' }
  if (lower === '.gitignore' || lower === '.gitattributes') return { icon: 'commit', color: '#F4511E' }
  if (lower === '.env' || lower.startsWith('.env.')) return { icon: 'lock', color: '#F43F5E' }
  if (lower === 'package.json' || lower === 'package-lock.json') return { icon: 'inventory_2', color: '#CB3837' }
  if (lower === 'readme.md') return { icon: 'info', color: '#38BDF8' }
  if (lower === 'vite.config.js' || lower === 'vite.config.ts') return { icon: 'bolt', color: '#A855F7' }
  if (lower === 'tailwind.config.js') return { icon: 'palette', color: '#38BDF8' }

  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : ''
  return FILE_ICONS[ext] || { icon: 'insert_drive_file', color: '#bdc8d1' }
}

function getFolderColor(name) {
  return FOLDER_COLORS[name] || FOLDER_COLORS[name.toLowerCase()] || '#8ed5ff'
}

export function getLangFromName(name) {
  const ext = name.split('.').pop()
  switch (ext) {
    case 'js': case 'jsx': return 'javascript'
    case 'ts': case 'tsx': return 'typescript'
    case 'py': return 'python'
    case 'go': return 'go'
    case 'c': return 'c'
    case 'cpp': return 'cpp'
    case 'java': return 'java'
    case 'rs': return 'rust'
    case 'rb': return 'ruby'
    case 'php': return 'php'
    case 'html': return 'html'
    case 'css': return 'css'
    case 'json': return 'json'
    case 'md': return 'markdown'
    default: return 'plaintext'
  }
}

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/* ── Tree helpers ────────────────────────────────────────── */
function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return null
}

function updateNode(nodes, id, updater) {
  return nodes.map(n => {
    if (n.id === id) return { ...n, ...updater(n) }
    if (n.children) return { ...n, children: updateNode(n.children, id, updater) }
    return n
  })
}

function deleteNode(nodes, id) {
  return nodes
    .filter(n => n.id !== id)
    .map(n => n.children ? { ...n, children: deleteNode(n.children, id) } : n)
}

function insertInto(nodes, parentId, newNode) {
  if (parentId === null) return [...nodes, newNode]
  return nodes.map(n => {
    if (n.id === parentId && n.type === 'folder') {
      return { ...n, expanded: true, children: [...(n.children || []), newNode] }
    }
    if (n.children) return { ...n, children: insertInto(n.children, parentId, newNode) }
    return n
  })
}

function sortNodes(nodes) {
  return [...nodes].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name)
    return a.type === 'folder' ? -1 : 1
  }).map(n => n.children ? { ...n, children: sortNodes(n.children) } : n)
}

/* ── Context Menu ─────────────────────────────────────────── */
function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Clamp to viewport
  const style = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - items.length * 36 - 8),
    zIndex: 9999,
    background: '#201f1f',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    minWidth: 180,
    padding: '4px 0',
    backdropFilter: 'blur(16px)',
  }

  return (
    <div ref={ref} style={style}>
      {items.map((item, i) =>
        item === 'sep' ? (
          <div key={i} style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '3px 0' }} />
        ) : (
          <button
            key={i}
            onClick={() => { item.action(); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '7px 14px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: item.danger ? '#F43F5E' : '#e5e2e1',
              fontSize: 12, fontFamily: 'Inter, sans-serif',
              textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: item.danger ? '#F43F5E' : '#8ed5ff', fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>
              {item.icon}
            </span>
            {item.label}
          </button>
        )
      )}
    </div>
  )
}

/* ── Single Tree Node ────────────────────────────────────── */
function TreeNode({
  node, depth, activeId, openIds,
  onSelect, onToggle, onRename, onDelete,
  onNewFile, onNewFolder, onContextMenu,
  renamingId, renameValue, setRenameValue, commitRename, cancelRename,
}) {
  const isActive   = node.id === activeId
  const isOpen     = openIds.has(node.id)
  const isRenaming = node.id === renamingId
  const indent     = depth * 14

  const { icon, color } = node.type === 'folder'
    ? { icon: isOpen ? 'folder_open' : 'folder', color: getFolderColor(node.name) }
    : getFileIcon(node.name)

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 8px 3px 0',
    paddingLeft: indent + (node.type === 'folder' ? 4 : 22),
    cursor: 'pointer',
    borderRadius: 4,
    background: isActive ? 'rgba(142,213,255,0.12)' : 'transparent',
    borderLeft: isActive ? '2px solid #8ed5ff' : '2px solid transparent',
    color: isActive ? '#8ed5ff' : '#bdc8d1',
    userSelect: 'none',
    transition: 'background 0.1s',
    position: 'relative',
    minHeight: 26,
  }

  return (
    <div>
      <div
        className="file-explorer-node"
        data-file-name={node.name}
        data-file-type={node.type}
        data-file-depth={depth}
        style={rowStyle}
        onClick={() => {
          if (node.type === 'folder') onToggle(node.id)
          else onSelect(node)
        }}
        onContextMenu={e => onContextMenu(e, node)}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
      >
        {/* Arrow for folders */}
        {node.type === 'folder' && (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 14, color: '#bdc8d1', flexShrink: 0, transition: 'transform 0.15s', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}
          >
            expand_more
          </span>
        )}

        {/* Icon */}
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 16, color, flexShrink: 0, fontVariationSettings: `'FILL' ${node.type === 'folder' && isOpen ? 1 : 0},'wght' 400,'GRAD' 0,'opsz' 24` }}
        >
          {icon}
        </span>

        {/* Name or rename input */}
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') cancelRename()
            }}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0e0e0e', border: '1px solid #38bdf8',
              color: '#e5e2e1', borderRadius: 4, padding: '1px 6px',
              fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
              outline: 'none', width: '100%', minWidth: 0,
            }}
          />
        ) : (
          <span
            style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
            onDoubleClick={e => { e.stopPropagation(); onRename(node) }}
          >
            {node.name}
          </span>
        )}
      </div>

      {/* Children */}
      {node.type === 'folder' && isOpen && node.children?.length > 0 && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              openIds={openIds}
              onSelect={onSelect}
              onToggle={onToggle}
              onRename={onRename}
              onDelete={onDelete}
              onNewFile={onNewFile}
              onNewFolder={onNewFolder}
              onContextMenu={onContextMenu}
              renamingId={renamingId}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              commitRename={commitRename}
              cancelRename={cancelRename}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main FileExplorer ───────────────────────────────────── */
export default function FileExplorer({ project, activeFileId, onFileSelect, onTreeChange, tree: externalTree }) {
  const defaultName = project?.name || 'project'
  const defaultExt  = getExtensionForLang(project?.lang)
  const rootId      = 'root-' + (project?.id || 'default')

  const storageKey = `cf_tree_${project?.id || 'default'}`

  const [tree, setTree] = useState(() => {
    // Try to load the saved tree for this project from localStorage
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch { /* ignore */ }
    // Default tree if nothing saved yet
    return [
      {
        id: rootId,
        name: defaultName,
        type: 'folder',
        children: [
          { id: genId(), name: `main.${defaultExt}`, type: 'file', content: project?.code || '', lang: project?.lang || 'javascript' },
          { id: genId(), name: 'README.md', type: 'file', content: `# ${defaultName}\n\nA Codefusion project.\n`, lang: 'markdown' },
        ],
      }
    ]
  })

  // Ref to skip onTreeChange for non-user-initiated tree changes
  // true on mount to skip the initial notification
  const skipNextNotifyRef = useRef(true)

  // Save tree to localStorage AND notify parent only for user-initiated changes
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(tree)) } catch { /* quota */ }
    if (skipNextNotifyRef.current) {
      skipNextNotifyRef.current = false
    } else {
      onTreeChange?.(tree)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree])

  // Sync tree with external (Yjs) updates — skip notifying parent (it already knows)
  useEffect(() => {
    if (externalTree && externalTree.length > 0) {
      if (JSON.stringify(tree) !== JSON.stringify(externalTree)) {
        skipNextNotifyRef.current = true
        setTree(externalTree)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTree])

  // Replace setTreeAndNotify with plain setTree — the effect above handles notification
  const setTreeAndNotify = setTree

  const [openIds, setOpenIds]     = useState(new Set([rootId]))
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [contextMenu, setContextMenu] = useState(null) // { x, y, node }
  const [dragOver, setDragOver]   = useState(false)

  const fileInputRef   = useRef(null)
  const folderInputRef = useRef(null)

  // Sync project name when project prop changes — skip notifying parent
  useEffect(() => {
    if (!project) return
    skipNextNotifyRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTree(prev => updateNode(prev, rootId, n => ({
      ...n,
      name: project.name || defaultName,
    })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  /* ── Actions ─────────────── */
  const toggleFolder = useCallback((id) => {
    setOpenIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }, [])

  const selectFile = useCallback((node) => {
    if (node.type !== 'file') return
    onFileSelect?.(node)
  }, [onFileSelect])

  const startRename = useCallback((node) => {
    setRenamingId(node.id)
    setRenameValue(node.name)
  }, [])

  const commitRename = useCallback(() => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return }
    setTreeAndNotify(prev => updateNode(prev, renamingId, n => ({
      ...n,
      name: renameValue.trim(),
      lang: n.type === 'file' ? getLangFromName(renameValue.trim()) : undefined,
    })))
    setRenamingId(null)
  }, [renamingId, renameValue, setTreeAndNotify])

  const cancelRename = useCallback(() => setRenamingId(null), [])

  const deleteNodeById = useCallback((id) => {
    setTreeAndNotify(prev => deleteNode(prev, id))
  }, [setTreeAndNotify])

  const addNode = useCallback((parentId, type) => {
    const name = type === 'folder' ? 'new-folder' : 'untitled.js'
    const newNode = type === 'folder'
      ? { id: genId(), name, type: 'folder', children: [] }
      : { id: genId(), name, type: 'file', content: '', lang: 'javascript' }
    setTreeAndNotify(prev => insertInto(prev, parentId, newNode))
    if (parentId) setOpenIds(prev => new Set([...prev, parentId]))
    // Start renaming immediately
    setTimeout(() => { setRenamingId(newNode.id); setRenameValue(name) }, 50)
  }, [setTreeAndNotify])

  /* ── File upload ─────────── */
  const processUploadedFiles = useCallback((files) => {
    // Build a virtual tree from file list
    const byPath = {}
    Array.from(files).forEach(file => {
      const path = file.webkitRelativePath || file.name
      byPath[path] = file
    })

    const rootNodes = []
    const folderMap = {}

    const ensureFolder = (parts) => {
      let current = rootNodes
      let parentId = null
      for (let i = 0; i < parts.length; i++) {
        const key = parts.slice(0, i + 1).join('/')
        if (!folderMap[key]) {
          const node = { id: genId(), name: parts[i], type: 'folder', children: [] }
          folderMap[key] = node
          current.push(node)
          if (parentId) setOpenIds(prev => new Set([...prev, parentId]))
        }
        parentId = folderMap[key].id
        current = folderMap[key].children
      }
      return { list: current, parentId }
    }

    const reads = []
    Object.entries(byPath).forEach(([path, file]) => {
      const parts = path.split('/')
      const fileName = parts.pop()
      const reader = new FileReader()
      const pr = new Promise(resolve => {
        reader.onload = e => {
          const content = e.target.result
          const fileNode = {
            id: genId(),
            name: fileName,
            type: 'file',
            content: typeof content === 'string' ? content : '[binary file]',
            lang: getLangFromName(fileName),
          }
          if (parts.length > 0) {
            const { list } = ensureFolder(parts)
            list.push(fileNode)
          } else {
            rootNodes.push(fileNode)
          }
          resolve()
        }
        // Read as text for code files
        const ext = fileName.split('.').pop()?.toLowerCase()
        if (['png','jpg','jpeg','gif','svg','ico','woff','woff2','ttf','eot','bin','pdf'].includes(ext)) {
          reader.readAsDataURL(file)
        } else {
          reader.readAsText(file)
        }
      })
      reads.push(pr)
    })

    Promise.all(reads).then(() => {
      const sorted = sortNodes(rootNodes)
      setTreeAndNotify(prev => {
        const root = prev[0]
        return [{ ...root, children: sortNodes([...(root.children || []), ...sorted]), expanded: true }]
      })
      setOpenIds(prev => new Set([...prev, rootId]))
    })
  }, [rootId])

  const handleFileInput = useCallback((e) => {
    if (e.target.files?.length) processUploadedFiles(e.target.files)
    e.target.value = ''
  }, [processUploadedFiles])

  /* ── Drag & Drop ─────────── */
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const items = e.dataTransfer.items
    if (!items) return

    const files = []
    const readEntry = (entry, path = '') => {
      return new Promise(resolve => {
        if (entry.isFile) {
          entry.file(file => {
            Object.defineProperty(file, 'webkitRelativePath', { value: path + file.name })
            files.push(file)
            resolve()
          })
        } else if (entry.isDirectory) {
          const reader = entry.createReader()
          reader.readEntries(entries => {
            Promise.all(entries.map(e2 => readEntry(e2, path + entry.name + '/'))).then(resolve)
          })
        } else resolve()
      })
    }

    const promises = []
    for (const item of items) {
      const entry = item.webkitGetAsEntry?.()
      if (entry) promises.push(readEntry(entry))
    }
    Promise.all(promises).then(() => processUploadedFiles(files))
  }, [processUploadedFiles])

  /* ── Context menu ─────────── */
  const handleContextMenu = useCallback((e, node) => {
    e.preventDefault()
    e.stopPropagation()
    const items = []
    if (node.type === 'folder') {
      items.push({ icon: 'note_add',      label: 'New File',   action: () => addNode(node.id, 'file') })
      items.push({ icon: 'create_new_folder', label: 'New Folder', action: () => addNode(node.id, 'folder') })
      items.push('sep')
    }
    items.push({ icon: 'drive_file_rename_outline', label: 'Rename', action: () => startRename(node) })
    if (node.id !== rootId) {
      items.push('sep')
      items.push({ icon: 'delete', label: 'Delete', danger: true, action: () => deleteNodeById(node.id) })
    }
    setContextMenu({ x: e.clientX, y: e.clientY, items })
  }, [addNode, startRename, deleteNodeById, rootId])

  /* ── Render ───────────────── */
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Hidden file inputs */}
      <input ref={fileInputRef}   type="file" multiple style={{ display: 'none' }} onChange={handleFileInput} />
      <input ref={folderInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileInput}
        {...{ webkitdirectory: '', directory: '' }} />

      {/* Header */}
      <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8ed5ff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>account_tree</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>EXPLORER</span>
          </div>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 2 }}>
            {[
              { icon: 'note_add',            title: 'New File',         action: () => addNode(rootId, 'file') },
              { icon: 'create_new_folder',   title: 'New Folder',       action: () => addNode(rootId, 'folder') },
              { icon: 'upload_file',         title: 'Upload Files',     action: () => { if(fileInputRef.current) fileInputRef.current.click() } },
              { icon: 'drive_folder_upload', title: 'Upload Folder',    action: () => { if(folderInputRef.current) folderInputRef.current.click() } },
              { icon: 'unfold_more',         title: 'Expand All',       action: () => {
                const ids = new Set()
                const collect = nodes => nodes.forEach(n => { if (n.type === 'folder') { ids.add(n.id); collect(n.children || []) } })
                collect(tree)
                setOpenIds(ids)
              }},
            ].map(btn => (
              <button key={btn.icon} title={btn.title} onClick={btn.action} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#bdc8d1', padding: '2px 3px', borderRadius: 4,
                display: 'flex', alignItems: 'center',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8ed5ff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#bdc8d1' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24" }}>{btn.icon}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drop Zone hint */}
      {dragOver && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          border: '2px dashed #8ed5ff', borderRadius: 8,
          background: 'rgba(142,213,255,0.08)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          pointerEvents: 'none',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#8ed5ff' }}>drive_folder_upload</span>
          <span style={{ color: '#8ed5ff', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700 }}>DROP FILES OR FOLDER</span>
        </div>
      )}

      {/* Tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px', position: 'relative' }}
        className="custom-scrollbar">
        {tree.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            activeId={activeFileId}
            openIds={openIds}
            onSelect={selectFile}
            onToggle={toggleFolder}
            onRename={startRename}
            onDelete={deleteNodeById}
            onNewFile={id => addNode(id, 'file')}
            onNewFolder={id => addNode(id, 'folder')}
            onContextMenu={handleContextMenu}
            renamingId={renamingId}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            commitRename={commitRename}
            cancelRename={cancelRename}
          />
        ))}

        {/* Empty state */}
        {tree.length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: '#bdc8d1', opacity: 0.5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>folder_open</span>
            <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>Drop files here or use<br />the buttons above</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
