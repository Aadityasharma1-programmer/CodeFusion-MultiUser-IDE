/* eslint-disable no-unused-vars */
import { useState, useMemo } from 'react'

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
  onPrimary:       '#00354a',
  cyberPink:       '#F43F5E',
  neonBlue:        '#38BDF8',
  matrixGreen:     '#10B981',
  secondary:       '#ffb2b7',
  warning:         '#F59E0B',
  glassBorder:     'rgba(255,255,255,0.10)',
}

const BRANCH_COLORS = [
  '#38BDF8', // main (cyan)
  '#F43F5E', // feature/collab (pink)
  '#10B981', // feature/theme (green)
  '#A855F7', // bugfix/auth (purple)
  '#F59E0B', // docs (yellow)
]

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

export default function GitGraphView({ commits: propCommits, onCloseTab }) {
  const [selectedCommitHash, setSelectedCommitHash] = useState(null)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('All')

  // Load commits from localstorage if not passed as prop, fallback to defaults
  const commits = useMemo(() => {
    if (propCommits && propCommits.length > 0) return propCommits

    const key = 'cf_git_commits'
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch { /* ignore */ }

    // Standard high-fidelity mock commits matching standard development logs
    return [
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
  }, [propCommits])

  // Get branches list
  const branches = useMemo(() => {
    const list = new Set(['All'])
    commits.forEach(c => { if (c.branch) list.add(c.branch) })
    return Array.from(list)
  }, [commits])

  // Filters
  const filteredCommits = useMemo(() => {
    return commits.filter(c => {
      const matchesBranch = branchFilter === 'All' || c.branch === branchFilter
      const matchesSearch = !search.trim() || 
        c.message.toLowerCase().includes(search.toLowerCase()) ||
        c.hash.toLowerCase().includes(search.toLowerCase()) ||
        c.author.toLowerCase().includes(search.toLowerCase())
      return matchesBranch && matchesSearch
    })
  }, [commits, branchFilter, search])

  // Retrieve selected commit
  const selectedCommit = useMemo(() => {
    return commits.find(c => c.hash === selectedCommitHash) || commits[0]
  }, [commits, selectedCommitHash])

  // Format Date human-friendly
  const formatDate = (isoStr) => {
    const d = new Date(isoStr)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // Pre-calculate line connections for the SVG graph column
  const svgWidth = 80
  const rowHeight = 44
  const gitPaths = useMemo(() => {
    const paths = []
    const commitMap = {}
    
    // Index commits by hash for fast lookup
    filteredCommits.forEach((c, idx) => {
      commitMap[c.hash] = { commit: c, index: idx }
    })

    filteredCommits.forEach((c, idx) => {
      const x1 = c.track * 18 + 16
      const y1 = idx * rowHeight + (rowHeight / 2)

      // Find children paths or parents paths
      if (c.parents) {
        c.parents.forEach(pHash => {
          const parentData = commitMap[pHash]
          if (parentData) {
            const pIdx = parentData.index
            const parentCommit = parentData.commit
            const x2 = parentCommit.track * 18 + 16
            const y2 = pIdx * rowHeight + (rowHeight / 2)

            // Dynamic curve drawing
            const d = x1 === x2
              ? `M ${x1} ${y1} L ${x2} ${y2}`
              : `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`

            paths.push({
              d,
              color: BRANCH_COLORS[c.track % BRANCH_COLORS.length],
              strokeWidth: 2,
              key: `${c.hash}-${parentCommit.hash}`
            })
          }
        })
      }
    })

    return paths
  }, [filteredCommits])

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: C.bg, overflow: 'hidden' }}>
      
      {/* Main Graph Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', borderRight: `1px solid ${C.glassBorder}` }}>
        
        {/* Graph Header / Toolbar */}
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${C.glassBorder}`,
          display: 'flex', alignItems: 'center', gap: 12,
          background: C.voidBlack, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.primary }}>
            <Icon name="commit" size={20} color={C.primary} />
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>GIT GRAPH</span>
          </div>

          <div style={{ width: 1, height: 16, background: C.glassBorder }} />

          {/* Search Input */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: C.surfaceCont, border: `1px solid ${C.glassBorder}`,
            borderRadius: 6, padding: '4px 10px', width: 220,
          }}>
            <Icon name="search" size={13} color={C.onSurfaceVar} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search commits…"
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: C.onSurface, fontSize: 11, width: '100%',
                fontFamily: '"JetBrains Mono", monospace',
              }}
            />
          </div>

          {/* Branch Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: C.onSurfaceVar, fontFamily: '"JetBrains Mono", monospace' }}>BRANCH:</span>
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              style={{
                background: C.surfaceCont, color: C.onSurface,
                border: `1px solid ${C.glassBorder}`, borderRadius: 6,
                padding: '4px 10px', fontSize: 11, outline: 'none',
                cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button
              onClick={() => { setSearch(''); setBranchFilter('All') }}
              title="Reset Filters"
              style={{
                background: 'none', border: `1px solid ${C.glassBorder}`, borderRadius: 6,
                padding: '4px 8px', color: C.onSurfaceVar, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.primary}
              onMouseLeave={e => e.currentTarget.style.color = C.onSurfaceVar}
            >
              <Icon name="restart_alt" size={14} />
            </button>
          </div>
        </div>

        {/* Git Log / Graph Table */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', position: 'relative' }} className="custom-scrollbar">
          
          {filteredCommits.length === 0 ? (
            <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: 0.5 }}>
              <Icon name="search_off" size={40} color={C.onSurfaceVar} />
              <span style={{ fontSize: 12, color: C.onSurfaceVar, fontFamily: 'JetBrains Mono' }}>No commits matched your filters.</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.glassBorder}`, background: 'rgba(0,0,0,0.15)' }}>
                  <th style={{ padding: '10px 16px', fontSize: 10, color: C.onSurfaceVar, width: svgWidth, fontFamily: '"JetBrains Mono", monospace' }}>GRAPH</th>
                  <th style={{ padding: '10px 16px', fontSize: 10, color: C.onSurfaceVar, width: 80, fontFamily: '"JetBrains Mono", monospace' }}>HASH</th>
                  <th style={{ padding: '10px 16px', fontSize: 10, color: C.onSurfaceVar, width: 110, fontFamily: '"JetBrains Mono", monospace' }}>BRANCH</th>
                  <th style={{ padding: '10px 16px', fontSize: 10, color: C.onSurfaceVar, fontFamily: '"JetBrains Mono", monospace' }}>DESCRIPTION</th>
                  <th style={{ padding: '10px 16px', fontSize: 10, color: C.onSurfaceVar, width: 140, fontFamily: '"JetBrains Mono", monospace' }}>AUTHOR</th>
                  <th style={{ padding: '10px 16px', fontSize: 10, color: C.onSurfaceVar, width: 130, fontFamily: '"JetBrains Mono", monospace' }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommits.map((c, idx) => {
                  const isSelected = selectedCommitHash === c.hash || (!selectedCommitHash && idx === 0)
                  const branchColor = BRANCH_COLORS[c.track % BRANCH_COLORS.length]

                  return (
                    <tr
                      key={c.hash}
                      onClick={() => setSelectedCommitHash(c.hash)}
                      style={{
                        height: rowHeight,
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        background: isSelected ? 'rgba(142,213,255,0.06)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'transparent' }}
                    >
                      {/* Graph Column with absolute overlay SVGs */}
                      <td style={{ padding: 0, position: 'relative', width: svgWidth, height: rowHeight, verticalAlign: 'middle' }}>
                        {idx === 0 && (
                          <svg style={{ position: 'absolute', top: 0, left: 0, width: svgWidth, height: rowHeight * filteredCommits.length, pointerEvents: 'none', zIndex: 1 }}>
                            {gitPaths.map(path => (
                              <path key={path.key} d={path.d} stroke={path.color} strokeWidth={path.strokeWidth} fill="none" opacity={0.8} />
                            ))}
                          </svg>
                        )}
                        <div style={{
                          position: 'relative', zIndex: 2,
                          left: c.track * 18 + 16 - 5,
                          width: 10, height: 10, borderRadius: '50%',
                          background: branchColor,
                          border: `2px solid ${isSelected ? '#fff' : C.bg}`,
                          boxShadow: isSelected ? `0 0 8px ${branchColor}` : 'none',
                        }} />
                      </td>

                      {/* Commit Hash */}
                      <td style={{ padding: '0 16px', fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: C.primary }}>
                        {c.hash}
                      </td>

                      {/* Branch Label */}
                      <td style={{ padding: '0 16px' }}>
                        <span style={{
                          fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
                          background: `${branchColor}15`, color: branchColor,
                          border: `1px solid ${branchColor}40`, borderRadius: 4, padding: '2px 6px',
                        }}>
                          {c.branch}
                        </span>
                      </td>

                      {/* Commit Description */}
                      <td style={{ padding: '0 16px', fontSize: 12, color: isSelected ? '#fff' : C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                        {c.message}
                      </td>

                      {/* Author */}
                      <td style={{ padding: '0 16px', fontSize: 11, color: C.onSurfaceVar }}>
                        {c.author}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '0 16px', fontSize: 11, color: C.onSurfaceVar, fontFamily: '"JetBrains Mono", monospace' }}>
                        {formatDate(c.date)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Side Details Pane (Commit Details + Simulated Diffs) */}
      {selectedCommit && (
        <aside style={{ width: 340, background: C.voidBlack, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Details Header */}
          <div style={{ padding: 14, borderBottom: `1px solid ${C.glassBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: C.onSurfaceVar }}>COMMIT DETAILS</span>
            <button
              onClick={() => setSelectedCommitHash(null)}
              style={{ background: 'none', border: 'none', color: C.onSurfaceVar, cursor: 'pointer', display: 'flex', padding: 0 }}
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }} className="custom-scrollbar">
            {/* Hash & Commit Info */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'JetBrains Mono' }}>{selectedCommit.hash}</span>
                <span style={{
                  fontSize: 9, fontFamily: '"JetBrains Mono", monospace',
                  background: 'rgba(56,189,248,0.1)', color: '#38BDF8',
                  borderRadius: 4, padding: '1px 5px', border: '1px solid rgba(56,189,248,0.2)'
                }}>{selectedCommit.branch}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#fff', fontWeight: 500, lineHeight: '18px' }}>{selectedCommit.message}</p>
            </div>

            {/* Author details */}
            <div style={{ borderBottom: `1px solid ${C.glassBorder}`, pb: 16, mb: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: C.surfaceContHigh,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: C.primary, border: `1px solid ${C.glassBorder}`
                }}>
                  {selectedCommit.author.charAt(0)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.onSurface }}>{selectedCommit.author}</span>
                  <span style={{ fontSize: 10, color: C.onSurfaceVar }}>{selectedCommit.email}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, color: C.onSurfaceVar, fontFamily: 'JetBrains Mono', paddingBottom: 16 }}>
                <span>Date: {new Date(selectedCommit.date).toString()}</span>
              </div>
            </div>

            {/* Files List */}
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.onSurfaceVar, fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 10 }}>
                CHANGED FILES ({selectedCommit.files.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedCommit.files.map(file => {
                  const isModified = file.status === 'modified'
                  const isAdded = file.status === 'added'
                  const isDeleted = file.status === 'deleted'
                  const statusColor = isAdded ? C.matrixGreen : isDeleted ? C.cyberPink : C.warning

                  return (
                    <div key={file.path} style={{
                      padding: '8px 10px', background: C.surfaceContLow, borderRadius: 6,
                      border: `1px solid ${C.glassBorder}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }} title={file.path}>
                          {file.path.split('/').pop()}
                        </span>
                        <span style={{
                          fontSize: 8, fontWeight: 700, fontFamily: 'JetBrains Mono',
                          color: statusColor, background: `${statusColor}10`,
                          border: `1px solid ${statusColor}30`, borderRadius: 4, padding: '1px 4px'
                        }}>
                          {file.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'true', fontSize: 9, color: C.onSurfaceVar, fontFamily: 'JetBrains Mono' }}>
                        <span>Path: {file.path}</span>
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          <span style={{ color: C.matrixGreen }}>+{file.additions}</span>
                          <span style={{ color: C.cyberPink }}>-{file.deletions}</span>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Diffs Viewer Simulation */}
              <div style={{ marginTop: 20 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.onSurfaceVar, fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 10 }}>
                  DIFF EXPLORER (MOCK)
                </span>
                <div style={{
                  background: C.voidBlack, border: `1px solid ${C.glassBorder}`, borderRadius: 6,
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 10, overflow: 'hidden'
                }}>
                  <div style={{ background: C.surfaceContHigh, padding: '4px 8px', borderBottom: `1px solid ${C.glassBorder}`, color: C.onSurface, fontSize: 9 }}>
                    diff --git a/{selectedCommit.files[0]?.path} b/{selectedCommit.files[0]?.path}
                  </div>
                  <pre style={{ margin: 0, padding: 8, overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: '14px' }}>
                    <span style={{ color: '#888' }}>@@ -14,8 +14,12 @@</span><br />
                    <span style={{ color: '#fff' }}> const root = createRoot(document.getElementById('root'));</span><br />
                    <span style={{ color: '#fff' }}> root.render(</span><br />
                    <span style={{ color: C.cyberPink, background: 'rgba(244,63,94,0.1)' }}>-  &lt;App /&gt;</span><br />
                    <span style={{ color: C.matrixGreen, background: 'rgba(16,185,129,0.1)' }}>+  &lt;StrictMode&gt;</span><br />
                    <span style={{ color: C.matrixGreen, background: 'rgba(16,185,129,0.1)' }}>+    &lt;Provider store={store}&gt;</span><br />
                    <span style={{ color: C.matrixGreen, background: 'rgba(16,185,129,0.1)' }}>+      &lt;App /&gt;</span><br />
                    <span style={{ color: C.matrixGreen, background: 'rgba(16,185,129,0.1)' }}>+    &lt;/Provider&gt;</span><br />
                    <span style={{ color: C.matrixGreen, background: 'rgba(16,185,129,0.1)' }}>+  &lt;/StrictMode&gt;</span><br />
                    <span style={{ color: '#fff' }}> );</span>
                  </pre>
                </div>
              </div>

            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
