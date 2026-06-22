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
  tertiary:        '#56e5a9',
  glassBorder:     'rgba(255,255,255,0.10)',
}

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

function Stars({ rating }) {
  return (
    <span style={{ display: 'flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Icon
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star_border'}
          size={10}
          fill={i <= Math.round(rating) ? 1 : 0}
          color={i <= Math.round(rating) ? '#F59E0B' : C.onSurfaceVar}
        />
      ))}
    </span>
  )
}

export const EXTENSIONS = [
  {
    id: 'fusion-copilot',
    name: 'Fusion Copilot',
    publisher: 'Codefusion',
    version: 'v2.1.0',
    description: 'AI-powered inline completions, chat, and code generation built directly into your editor.',
    category: 'AI Tools',
    icon: 'psychology',
    iconColor: C.cyberPink,
    rating: 4.9,
    downloads: '2.4M',
    featured: true,
    installed: true,
    recommended: true,
    tags: ['ai', 'autocomplete', 'chat'],
    details: `
### Fusion Copilot
An advanced AI assistant designed to automate code writing, comments generation, and debugging.

### Features
- 🧠 **Inline Autocomplete**: Suggestions update in real-time.
- 💬 **Code Chat integration**: Discuss issues right from the sidebar.
- ⚡ **Auto-Bugfixing**: Detects error syntax and fixes instantly.
    `,
    changelog: [
      { version: 'v2.1.0', date: '2026-06-15', notes: ['Enhanced autocomplete engine speed by 30%', 'Added support for Go code formatting suggestions'] },
      { version: 'v1.0.0', date: '2026-03-01', notes: ['Initial beta release of AI autocomplete assistant'] }
    ],
    reviews: [
      { author: 'Jane Smith', rating: 5, comment: 'Highly recommended! Autocomplete is extremely smart.' }
    ]
  },
  {
    id: 'cyber-dark-pro',
    name: 'Cyber Dark Pro',
    publisher: 'Studio Neon',
    version: 'v1.4.2',
    description: 'A stunning cyberpunk-inspired dark theme with vivid neon accents and glassmorphism highlights.',
    category: 'Themes',
    icon: 'palette',
    iconColor: '#A855F7',
    rating: 4.8,
    downloads: '1.1M',
    featured: true,
    installed: true,
    recommended: false,
    tags: ['theme', 'dark', 'cyberpunk'],
    details: `
### Cyber Dark Pro Theme
Experience a neon cyber world in your editor. Vivid tones of violet, pink, and neon blue make code structure pop.

### Customizations
- 🌟 **Glow Accents**: Vibrant neon brackets and selections.
- 🖤 **Deep Contrast**: High readability in low-light environments.
    `,
    changelog: [
      { version: 'v1.4.2', date: '2026-05-10', notes: ['Added glowing borders to editor workspace tabs'] },
      { version: 'v1.0.0', date: '2026-01-20', notes: ['Theme release'] }
    ],
    reviews: [
      { author: 'Developer Ken', rating: 5, comment: 'Beautiful colors, my new primary theme!' }
    ]
  },
  {
    id: 'prettier',
    name: 'Prettier – Code Formatter',
    publisher: 'Prettier',
    version: 'v3.0.1',
    description: 'An opinionated code formatter that enforces a consistent style by parsing your code and re-printing it.',
    category: 'Formatters',
    icon: 'auto_fix_high',
    iconColor: C.matrixGreen,
    rating: 4.8,
    downloads: '5.3M',
    featured: true,
    installed: true,
    recommended: true,
    tags: ['formatter', 'javascript', 'typescript'],
    details: `
### Prettier
An opinionated code formatter. Enforces style consistency across folders.

### Usage
- Right-click in the editor and choose **Format Document**, or use the terminal.
    `,
    changelog: [
      { version: 'v3.0.1', date: '2026-04-12', notes: ['Prettier indentation parsing updates'] }
    ],
    reviews: [
      { author: 'Lars O.', rating: 5, comment: 'Saves time, no more style arguments.' }
    ]
  },
  {
    id: 'eslint',
    name: 'ESLint',
    publisher: 'Microsoft',
    version: 'v2.4.4',
    description: 'Integrates ESLint into VS Code. ESLint statically analyzes your code to quickly find problems.',
    category: 'Linters',
    icon: 'policy',
    iconColor: '#6366F1',
    rating: 4.7,
    downloads: '4.8M',
    featured: false,
    installed: false,
    recommended: true,
    tags: ['linter', 'javascript', 'typescript'],
    details: `
### ESLint
Find and fix problems in your JavaScript code statically. Highlights structural issues.
    `,
    changelog: [
      { version: 'v2.4.4', date: '2026-02-18', notes: ['Bug fixes'] }
    ],
    reviews: [
      { author: 'Coder A', rating: 4, comment: 'Essential for catching typescript bugs.' }
    ]
  },
  {
    id: 'gitlens',
    name: 'GitLens — Git Supercharged',
    publisher: 'GitKraken',
    version: 'v14.0.0',
    description: 'Supercharge Git inside your editor. Unlock the power of Git blame annotations, code authorship, and rich history.',
    category: 'Git',
    icon: 'commit',
    iconColor: '#F4511E',
    rating: 4.9,
    downloads: '3.2M',
    featured: true,
    installed: false,
    recommended: true,
    tags: ['git', 'blame', 'history'],
    details: `
### GitLens Supercharged
Blame annotations in line, rich commit details popup, file history navigation.

### Key Features
- 🔍 **Git Blame annotations**: View authorship inline at the end of lines.
    `,
    changelog: [
      { version: 'v14.0.0', date: '2026-05-22', notes: ['Enhanced inline authorship text rendering'] }
    ],
    reviews: [
      { author: 'Git Master', rating: 5, comment: 'Amazing blame annotations.' }
    ]
  },
  {
    id: 'error-lens',
    name: 'Error Lens',
    publisher: 'Alexander',
    version: 'v3.2.1',
    description: 'Improve highlighting of errors, warnings and other language diagnostics. See issues inline as you type.',
    category: 'Linters',
    icon: 'error',
    iconColor: C.cyberPink,
    rating: 4.7,
    downloads: '2.1M',
    featured: false,
    installed: false,
    recommended: true,
    tags: ['errors', 'warnings', 'diagnostics'],
    details: `
### Error Lens
See code diagnostics (errors, warnings) printed directly at the end of the line.
    `,
    changelog: [
      { version: 'v3.2.1', date: '2026-01-15', notes: ['Added diagnostic coloring custom rules'] }
    ],
    reviews: [
      { author: 'Bug Hunter', rating: 5, comment: 'Incredible for catching syntax mistakes immediately.' }
    ]
  },
  {
    id: 'python-pack',
    name: 'Python Support Pack',
    publisher: 'Microsoft',
    version: 'v2026.2.0',
    description: 'Full Python language support: IntelliSense, linting, debugging, code navigation, refactoring, and more.',
    category: 'Languages',
    icon: 'code',
    iconColor: '#3572A5',
    rating: 4.8,
    downloads: '6.1M',
    featured: false,
    installed: false,
    recommended: false,
    tags: ['python', 'language', 'debugging'],
    details: `
### Python Language Pack
Adds code autocomplete, execution parameters, and lint parsing for Python (.py) files.
    `,
    changelog: [],
    reviews: []
  },
  {
    id: 'go-tools',
    name: 'Go Language Tools',
    publisher: 'Google',
    version: 'v0.41.0',
    description: 'Rich Go language support with IntelliSense, code navigation, formatting via gofmt, and debugging.',
    category: 'Languages',
    icon: 'code',
    iconColor: '#00ADD8',
    rating: 4.8,
    downloads: '1.8M',
    featured: false,
    installed: false,
    recommended: false,
    tags: ['go', 'golang', 'language'],
    details: `
### Go Support
Complete syntax validation, package imports completion, and formatting.
    `,
    changelog: [],
    reviews: []
  },
  {
    id: 'rust-analyzer',
    name: 'rust-analyzer',
    publisher: 'The Rust Programming Language',
    version: 'v0.3.1890',
    description: 'An alternative rust language server to the RLS. Provides completions, go to definition, and more.',
    category: 'Languages',
    icon: 'code',
    iconColor: '#CE412B',
    rating: 4.9,
    downloads: '980K',
    featured: false,
    installed: false,
    recommended: false,
    tags: ['rust', 'language'],
    details: `
### rust-analyzer
Semantic syntax tree parsing, autocomplete macros, and code generation helper tools.
    `,
    changelog: [],
    reviews: []
  },
  {
    id: 'dracula',
    name: 'Dracula Official',
    publisher: 'Dracula Theme',
    version: 'v2.24.1',
    description: 'A dark theme for many editors and tools. Beloved by millions for its balanced contrast and soothing palette.',
    category: 'Themes',
    icon: 'palette',
    iconColor: '#BD93F9',
    rating: 4.7,
    downloads: '4.4M',
    featured: false,
    installed: false,
    recommended: false,
    tags: ['theme', 'dark'],
    details: `
### Dracula Official
The legendary dark theme for developers. Features deep purple backdrops, neon green brackets, and clean pink statements.
    `,
    changelog: [
      { version: 'v2.24.1', date: '2026-02-12', notes: ['Optimized syntax styling for JSON files'] }
    ],
    reviews: [
      { author: 'Count Dev', rating: 5, comment: 'Dracula is life.' }
    ]
  },
  {
    id: 'one-dark-pro',
    name: 'One Dark Pro',
    publisher: 'binaryify',
    version: 'v3.17.0',
    description: 'Atom\'s iconic One Dark theme for Visual Studio Code and now for Codefusion. The most popular dark theme.',
    category: 'Themes',
    icon: 'palette',
    iconColor: '#61DAFB',
    rating: 4.8,
    downloads: '8.7M',
    featured: false,
    installed: false,
    recommended: false,
    tags: ['theme', 'dark', 'atom'],
    details: `
### One Dark Pro
Voted the most popular developer theme. Perfectly balanced colors that reduce eye fatigue.
    `,
    changelog: [],
    reviews: []
  }
]

const CATEGORIES = ['All', 'AI Tools', 'Themes', 'Languages', 'Formatters', 'Linters', 'Git']
const TABS = ['Featured', 'Installed', 'Recommended']

function ExtensionCard({ ext, onToggleInstall, installing, onSelect }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect?.(ext)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '10px 12px',
        borderRadius: 8,
        border: `1px solid ${hovered ? 'rgba(142,213,255,0.2)' : C.glassBorder}`,
        background: hovered ? 'rgba(142,213,255,0.04)' : 'transparent',
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}
    >
      {/* Top row: icon + name + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: `${ext.iconColor}20`,
          border: `1px solid ${ext.iconColor}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={ext.icon} size={18} fill={1} color={ext.iconColor} />
        </div>

        {/* Name + publisher */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.onSurface, lineHeight: '18px' }}>{ext.name}</span>
            {ext.installed && (
              <span style={{
                fontSize: 8, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, letterSpacing: '0.08em',
                background: 'rgba(16,185,129,0.15)', color: C.matrixGreen,
                border: `1px solid rgba(16,185,129,0.3)`, borderRadius: 4, padding: '1px 5px',
              }}>INSTALLED</span>
            )}
            {!ext.installed && ext.recommended && (
              <span style={{
                fontSize: 8, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, letterSpacing: '0.08em',
                background: 'rgba(142,213,255,0.1)', color: C.primary,
                border: `1px solid rgba(142,213,255,0.25)`, borderRadius: 4, padding: '1px 5px',
              }}>RECOMMENDED</span>
            )}
          </div>
          <span style={{ fontSize: 10, color: C.onSurfaceVar }}>{ext.publisher} • <span style={{ fontFamily: 'JetBrains Mono' }}>{ext.version}</span></span>
        </div>
      </div>

      {/* Description */}
      <p style={{ margin: 0, fontSize: 11, color: C.onSurfaceVar, lineHeight: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {ext.description}
      </p>

      {/* Bottom row: rating + downloads + install btn */}
      <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'true', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Stars rating={ext.rating} />
          <span style={{ fontSize: 9, color: C.onSurfaceVar, fontFamily: '"JetBrains Mono", monospace' }}>
            {ext.rating}
          </span>
          <span style={{ fontSize: 9, color: C.onSurfaceVar, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Icon name="download" size={11} color={C.onSurfaceVar} />
            {ext.downloads}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleInstall(ext.id)
          }}
          disabled={installing === ext.id}
          style={{
            padding: '4px 10px',
            background: ext.installed ? 'transparent' : C.primary,
            color: ext.installed ? C.onSurfaceVar : C.onPrimary,
            border: ext.installed ? `1px solid ${C.glassBorder}` : 'none',
            borderRadius: 6,
            fontSize: 9,
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 700,
            letterSpacing: '0.06em',
            cursor: installing === ext.id ? 'not-allowed' : 'pointer',
            opacity: installing === ext.id ? 0.6 : 1,
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            if (installing === ext.id) return
            e.currentTarget.style.filter = 'brightness(1.15)'
            if (ext.installed) e.currentTarget.style.borderColor = C.cyberPink
          }}
          onMouseLeave={e => {
            e.currentTarget.style.filter = 'none'
            if (ext.installed) e.currentTarget.style.borderColor = C.glassBorder
          }}
        >
          {installing === ext.id
            ? (ext.installed ? 'REMOVING…' : 'INSTALLING…')
            : ext.installed ? 'UNINSTALL' : 'INSTALL'}
        </button>
      </div>
    </div>
  )
}

export default function ExtensionsPanel({ onSelectExtension, onToggleInstall, installing, extStates }) {
  const [activeTab,    setActiveTab]    = useState('Featured')
  const [activeCategory, setActiveCategory] = useState('All')
  const [search,       setSearch]       = useState('')

  // Merge dynamic installed state into extension list
  const extensions = useMemo(() =>
    EXTENSIONS.map(e => ({ ...e, installed: extStates[e.id] ?? e.installed })),
    [extStates]
  )

  // Filter by tab
  const tabFiltered = useMemo(() => {
    switch (activeTab) {
      case 'Installed':    return extensions.filter(e => e.installed)
      case 'Recommended':  return extensions.filter(e => e.recommended && !e.installed)
      default:             return extensions.filter(e => e.featured || e.installed)
    }
  }, [extensions, activeTab])

  // Filter by category
  const catFiltered = useMemo(() =>
    activeCategory === 'All' ? tabFiltered : tabFiltered.filter(e => e.category === activeCategory),
    [tabFiltered, activeCategory]
  )

  // Filter by search query
  const displayed = useMemo(() => {
    if (!search.trim()) return catFiltered
    const q = search.toLowerCase()
    return catFiltered.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.publisher.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.tags.some(t => t.includes(q))
    )
  }, [catFiltered, search])

  const installedCount = extensions.filter(e => e.installed).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '0 12px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.primary, marginBottom: 10 }}>
          <Icon name="extension" size={18} color={C.primary} />
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
            EXTENSIONS
          </span>
          {installedCount > 0 && (
            <span style={{
              marginLeft: 'auto', fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
              background: 'rgba(142,213,255,0.12)', color: C.primary,
              border: `1px solid rgba(142,213,255,0.25)`, borderRadius: 10, padding: '1px 6px',
            }}>
              {installedCount} installed
            </span>
          )}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.voidBlack, border: `1px solid ${C.glassBorder}`, borderRadius: 6, padding: '5px 10px', marginBottom: 8 }}>
          <Icon name="search" size={13} color={C.onSurfaceVar} style={{ flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search extensions…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: C.onSurface, fontSize: 12,
              fontFamily: '"JetBrains Mono", monospace',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <Icon name="close" size={12} color={C.onSurfaceVar} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.glassBorder}`, marginBottom: 8 }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 10, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
                letterSpacing: '0.06em',
                color: activeTab === tab ? C.primary : C.onSurfaceVar,
                borderBottom: activeTab === tab ? `2px solid ${C.primary}` : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.15s',
              }}
            >
              {tab.toUpperCase()}
              {tab === 'Installed' && installedCount > 0 && (
                <span style={{ marginLeft: 4, background: 'rgba(142,213,255,0.15)', color: C.primary, borderRadius: 8, padding: '0 4px', fontSize: 9 }}>
                  {installedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }} className="custom-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '3px 8px',
                background: activeCategory === cat ? 'rgba(142,213,255,0.15)' : 'transparent',
                border: activeCategory === cat ? `1px solid rgba(142,213,255,0.4)` : `1px solid ${C.glassBorder}`,
                borderRadius: 12,
                fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
                letterSpacing: '0.04em',
                color: activeCategory === cat ? C.primary : C.onSurfaceVar,
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Extension List ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }} className="custom-scrollbar">
        {displayed.length === 0 ? (
          <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.5 }}>
            <Icon name="extension_off" size={36} color={C.onSurfaceVar} />
            <p style={{ margin: 0, fontSize: 11, color: C.onSurfaceVar, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
              {activeTab === 'Installed' ? 'No extensions installed yet.' : 'No extensions found.'}
            </p>
          </div>
        ) : (
          displayed.map(ext => (
            <ExtensionCard
              key={ext.id}
              ext={ext}
              onToggleInstall={onToggleInstall}
              installing={installing}
              onSelect={onSelectExtension}
            />
          ))
        )}
      </div>
    </div>
  )
}
