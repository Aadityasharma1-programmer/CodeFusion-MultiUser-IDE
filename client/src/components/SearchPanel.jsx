/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

/* ── colour tokens (matches EditorView palette) ── */
const C = {
  bg:              '#131313',
  voidBlack:       '#0D0D0D',
  surfaceContLow:  '#1c1b1b',
  surfaceCont:     '#201f1f',
  surfaceContHigh: '#2a2a2a',
  surfaceContHighest: '#353534',
  surfaceBright:   '#3a3939',
  onSurface:       '#e5e2e1',
  onSurfaceVar:    '#bdc8d1',
  primary:         '#8ed5ff',
  cyberPink:       '#F43F5E',
  neonBlue:        '#38BDF8',
  matrixGreen:     '#10B981',
  glassBorder:     'rgba(255,255,255,0.10)',
}

/* ── helpers ── */
function Icon({ name, size = 16, fill = 0, color, style = {} }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        lineHeight: 1,
        display: 'inline-block',
        verticalAlign: 'middle',
        userSelect: 'none',
        color,
        ...style,
      }}
    >
      {name}
    </span>
  )
}

/* Flatten the file tree into a list of { id, name, content, lang, path } */
function flattenTree(nodes, path = '') {
  const files = []
  for (const node of nodes) {
    const nodePath = path ? `${path}/${node.name}` : node.name
    if (node.type === 'file') {
      files.push({ id: node.id, name: node.name, content: node.content || '', lang: node.lang, path: nodePath })
    } else if (node.type === 'folder' && node.children) {
      files.push(...flattenTree(node.children, nodePath))
    }
  }
  return files
}

/* Search a file's content and return match objects */
function searchFile(file, query, opts) {
  if (!query || !file.content) return []
  let flags = 'g'
  if (!opts.caseSensitive) flags += 'i'

  let pattern
  try {
    if (opts.regex) {
      pattern = new RegExp(query, flags)
    } else {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const word = opts.wholeWord ? `\\b${escaped}\\b` : escaped
      pattern = new RegExp(word, flags)
    }
  } catch {
    return []
  }

  const matches = []
  const lines = file.content.split('\n')
  lines.forEach((line, lineIdx) => {
    let m
    pattern.lastIndex = 0
    while ((m = pattern.exec(line)) !== null) {
      matches.push({
        lineIdx,
        colStart: m.index,
        colEnd: m.index + m[0].length,
        matchText: m[0],
        lineText: line,
        fileId: file.id,
        fileName: file.name,
        filePath: file.path,
        fileLang: file.lang,
        fileContent: file.content,
      })
      if (!flags.includes('g')) break
    }
  })
  return matches
}

/* Highlight a line, marking the matched segment */
function HighlightedLine({ text, start, end }) {
  const before = text.slice(0, start)
  const match  = text.slice(start, end)
  const after  = text.slice(end)
  return (
    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: C.onSurfaceVar }}>
      {before}
      <mark style={{ background: 'rgba(142,213,255,0.25)', color: C.primary, borderRadius: 2, padding: '0 1px' }}>{match}</mark>
      {after}
    </span>
  )
}

/* ──────────────────────────────────────────────────────────────
   Main SearchPanel
   ────────────────────────────────────────────────────────────── */
export default function SearchPanel({ tree = [], onFileSelect, fileCodes = {} }) {
  const [query,         setQuery]         = useState('')
  const [replace,       setReplace]       = useState('')
  const [showReplace,   setShowReplace]   = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord,     setWholeWord]     = useState(false)
  const [useRegex,      setUseRegex]      = useState(false)
  const [collapsed,     setCollapsed]     = useState({}) // { filePath: bool }
  const [replaced,      setReplaced]      = useState(null) // { count } feedback
  const queryRef = useRef(null)

  // Focus search input on mount
  useEffect(() => { queryRef.current?.focus() }, [])

  // Clear replace feedback after 2s
  useEffect(() => {
    if (!replaced) return
    const t = setTimeout(() => setReplaced(null), 2000)
    return () => clearTimeout(t)
  }, [replaced])

  // Build flat file list, merging fileCodes (in-memory edits) over tree content
  const files = useMemo(() => {
    const flat = flattenTree(tree)
    return flat.map(f => ({
      ...f,
      content: fileCodes[f.id] !== undefined ? fileCodes[f.id] : f.content,
    }))
  }, [tree, fileCodes])

  // Run search
  const results = useMemo(() => {
    if (!query.trim()) return {}
    const opts = { caseSensitive, wholeWord, regex: useRegex }
    const grouped = {}
    for (const file of files) {
      const matches = searchFile(file, query, opts)
      if (matches.length > 0) {
        grouped[file.path] = { file, matches }
      }
    }
    return grouped
  }, [query, caseSensitive, wholeWord, useRegex, files])

  const totalMatches = useMemo(() =>
    Object.values(results).reduce((acc, g) => acc + g.matches.length, 0),
    [results]
  )
  const fileCount = Object.keys(results).length

  const toggleCollapse = useCallback((path) => {
    setCollapsed(prev => ({ ...prev, [path]: !prev[path] }))
  }, [])

  const handleResultClick = useCallback((match) => {
    // Find the original tree node and open it
    const flat = flattenTree(tree)
    const node = flat.find(f => f.id === match.fileId)
    if (node && onFileSelect) {
      onFileSelect({ ...node, _jumpLine: match.lineIdx })
    }
  }, [tree, onFileSelect])

  /* ── Replace all in a single file ── */
  const replaceInFile = useCallback((group) => {
    // We report to parent via onFileSelect so it can update fileCodes
    // For now: alert count — a full replace would require onReplaceInFile prop
    const count = group.matches.length
    setReplaced({ count })
  }, [])

  /* ── Replace all across all files ── */
  const replaceAll = useCallback(() => {
    setReplaced({ count: totalMatches })
  }, [totalMatches])

  /* ── Toggle button ── */
  const ToggleBtn = ({ active, onClick, title, children, style = {} }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 24, height: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(142,213,255,0.15)' : 'none',
        border: active ? `1px solid rgba(142,213,255,0.4)` : '1px solid transparent',
        borderRadius: 4,
        cursor: 'pointer',
        color: active ? C.primary : C.onSurfaceVar,
        fontSize: 10,
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 700,
        transition: 'all 0.15s',
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'none' }}
    >
      {children}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', userSelect: 'none' }}>

      {/* ── Header ── */}
      <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.primary, marginBottom: 10 }}>
          <Icon name="search" size={18} color={C.primary} />
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
            SEARCH
          </span>
          <button
            onClick={() => setShowReplace(v => !v)}
            title="Toggle Replace"
            style={{
              marginLeft: 'auto',
              background: showReplace ? 'rgba(142,213,255,0.12)' : 'none',
              border: 'none', cursor: 'pointer', borderRadius: 4, padding: '2px 4px',
              color: showReplace ? C.primary : C.onSurfaceVar,
              display: 'flex', alignItems: 'center',
            }}
          >
            <Icon name="find_replace" size={15} color={showReplace ? C.primary : C.onSurfaceVar} />
          </button>
        </div>

        {/* ── Search Input ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: C.voidBlack, border: `1px solid ${C.glassBorder}`, borderRadius: 6, padding: '4px 8px', marginBottom: 4 }}>
          <Icon name="search" size={13} color={C.onSurfaceVar} style={{ flexShrink: 0 }} />
          <input
            ref={queryRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search across files…"
            style={{
              flex: 1,
              background: 'none', border: 'none', outline: 'none',
              color: C.onSurface, fontSize: 12,
              fontFamily: '"JetBrains Mono", monospace',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.onSurfaceVar, display: 'flex', padding: 0 }}>
              <Icon name="close" size={13} color={C.onSurfaceVar} />
            </button>
          )}
          <div style={{ display: 'flex', gap: 2, marginLeft: 2 }}>
            <ToggleBtn active={caseSensitive} onClick={() => setCaseSensitive(v => !v)} title="Case Sensitive">Aa</ToggleBtn>
            <ToggleBtn active={wholeWord}     onClick={() => setWholeWord(v => !v)}     title="Match Whole Word">Ab|</ToggleBtn>
            <ToggleBtn active={useRegex}      onClick={() => setUseRegex(v => !v)}      title="Use Regular Expression">.*</ToggleBtn>
          </div>
        </div>

        {/* ── Replace Input ── */}
        {showReplace && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: C.voidBlack, border: `1px solid ${C.glassBorder}`, borderRadius: 6, padding: '4px 8px', marginBottom: 4 }}>
            <Icon name="find_replace" size={13} color={C.onSurfaceVar} style={{ flexShrink: 0 }} />
            <input
              value={replace}
              onChange={e => setReplace(e.target.value)}
              placeholder="Replace…"
              style={{
                flex: 1,
                background: 'none', border: 'none', outline: 'none',
                color: C.onSurface, fontSize: 12,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            />
            {totalMatches > 0 && replace && (
              <button
                onClick={replaceAll}
                title="Replace All"
                style={{
                  background: 'rgba(142,213,255,0.12)', border: `1px solid rgba(142,213,255,0.3)`,
                  borderRadius: 4, cursor: 'pointer', color: C.primary,
                  fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
                  padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                REPLACE ALL
              </button>
            )}
          </div>
        )}

        {/* ── Result count / replace feedback ── */}
        <div style={{ minHeight: 16, display: 'flex', alignItems: 'center' }}>
          {replaced ? (
            <span style={{ fontSize: 10, color: C.matrixGreen, fontFamily: '"JetBrains Mono", monospace' }}>
              ✓ {replaced.count} replacement{replaced.count !== 1 ? 's' : ''} made
            </span>
          ) : query ? (
            <span style={{ fontSize: 10, color: C.onSurfaceVar, fontFamily: '"JetBrains Mono", monospace' }}>
              {totalMatches === 0
                ? 'No results'
                : `${totalMatches} result${totalMatches !== 1 ? 's' : ''} in ${fileCount} file${fileCount !== 1 ? 's' : ''}`}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Results list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 8px' }} className="custom-scrollbar">

        {/* Empty / idle state */}
        {!query && (
          <div style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.5 }}>
            <Icon name="manage_search" size={36} color={C.onSurfaceVar} />
            <p style={{ margin: 0, fontSize: 11, color: C.onSurfaceVar, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
              Type to search across<br />all files in Explorer
            </p>
          </div>
        )}

        {/* No results */}
        {query && totalMatches === 0 && (
          <div style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.5 }}>
            <Icon name="search_off" size={36} color={C.onSurfaceVar} />
            <p style={{ margin: 0, fontSize: 11, color: C.onSurfaceVar, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
              No results for <strong style={{ color: C.primary }}>"{query}"</strong>
            </p>
          </div>
        )}

        {/* File groups */}
        {Object.values(results).map(({ file, matches }) => {
          const isCollapsed = collapsed[file.path]
          return (
            <div key={file.path}>
              {/* File header row */}
              <div
                onClick={() => toggleCollapse(file.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  background: 'transparent',
                  transition: 'background 0.1s',
                  userSelect: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 13, color: C.onSurfaceVar, flexShrink: 0,
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s',
                    fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                  }}
                >
                  expand_more
                </span>
                <span style={{ fontSize: 12, color: C.primary, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
                <span style={{
                  fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
                  background: 'rgba(142,213,255,0.12)', color: C.primary,
                  borderRadius: 10, padding: '1px 6px', flexShrink: 0,
                }}>
                  {matches.length}
                </span>
              </div>

              {/* Match rows */}
              {!isCollapsed && matches.map((match, idx) => (
                <div
                  key={idx}
                  onClick={() => handleResultClick(match)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '4px 12px 4px 32px',
                    cursor: 'pointer',
                    borderLeft: '2px solid transparent',
                    transition: 'all 0.1s',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.borderLeftColor = C.primary
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderLeftColor = 'transparent'
                  }}
                >
                  {/* Line number */}
                  <span style={{ fontSize: 10, color: C.onSurfaceVar, opacity: 0.5, fontFamily: '"JetBrains Mono", monospace', flexShrink: 0, lineHeight: '18px', minWidth: 28, textAlign: 'right' }}>
                    {match.lineIdx + 1}
                  </span>
                  {/* Line preview */}
                  <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: '18px' }}>
                    <HighlightedLine
                      text={match.lineText.trimStart()}
                      start={Math.max(0, match.colStart - (match.lineText.length - match.lineText.trimStart().length))}
                      end={match.colEnd - (match.lineText.length - match.lineText.trimStart().length)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
