/* eslint-disable no-unused-vars */
import { useMemo } from 'react'

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

function Icon({ name, size = 15, fill = 0, color, style = {} }) {
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

const SYMBOL_STYLES = {
  class:    { icon: 'view_in_ar',     color: '#EC4899' }, // Pink
  function: { icon: 'functions',      color: '#38BDF8' }, // Blue
  method:   { icon: 'segment',        color: '#A855F7' }, // Purple
  variable: { icon: 'tag',            color: '#10B981' }, // Green
  import:   { icon: 'login',          color: '#F59E0B' }, // Amber
  export:   { icon: 'logout',         color: '#F59E0B' },
  tag:      { icon: 'html',           color: '#E34F26' }, // HTML Red
  cssRule:  { icon: 'style',          color: '#3178C6' }, // CSS Blue
}

export default function OutlinePanel({ code = '', language = 'javascript', onSelectSymbol }) {
  
  const symbols = useMemo(() => {
    if (!code || typeof code !== 'string') return []

    const lines = code.split('\n')
    const list = []

    lines.forEach((line, idx) => {
      const lineNum = idx + 1
      const trimmed = line.trim()

      if (language === 'javascript' || language === 'typescript') {
        // Class
        const classMatch = trimmed.match(/^export\s+default\s+class\s+([A-Za-z0-9_$]+)/) ||
                           trimmed.match(/^export\s+class\s+([A-Za-z0-9_$]+)/) ||
                           trimmed.match(/^class\s+([A-Za-z0-9_$]+)/)
        if (classMatch) {
          list.push({ name: classMatch[1], type: 'class', line: lineNum })
          return
        }

        // Functions
        const funcMatch = trimmed.match(/^export\s+default\s+function\s+([A-Za-z0-9_$]+)/) ||
                          trimmed.match(/^export\s+function\s+([A-Za-z0-9_$]+)/) ||
                          trimmed.match(/^function\s+([A-Za-z0-9_$]+)/)
        if (funcMatch) {
          list.push({ name: funcMatch[1], type: 'function', line: lineNum })
          return
        }

        // Arrow functions / constants
        const arrowMatch = trimmed.match(/^(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/)
        if (arrowMatch) {
          list.push({ name: arrowMatch[1], type: 'function', line: lineNum })
          return
        }

        // Imports
        const importMatch = trimmed.match(/^import\s+(?:.*?from\s+)?['"](.*?)['"]/)
        if (importMatch) {
          const name = trimmed.includes('import') && trimmed.includes('from')
            ? trimmed.split('from')[0].replace('import', '').trim()
            : importMatch[1]
          
          // Clamp length of long import statements
          const display = name.length > 25 ? name.substring(0, 22) + '...' : name
          list.push({ name: display, type: 'import', line: lineNum })
          return
        }
      }

      if (language === 'python') {
        // Python Classes
        const pyClass = trimmed.match(/^class\s+([A-Za-z0-9_]+)(?:\((.*?)\))?:/)
        if (pyClass) {
          list.push({ name: pyClass[1], type: 'class', line: lineNum })
          return
        }

        // Python Functions
        const pyFunc = trimmed.match(/^def\s+([A-Za-z0-9_]+)\s*\(/)
        if (pyFunc) {
          // If indented, it's likely a method
          const isMethod = line.startsWith('    ') || line.startsWith('\t')
          list.push({ name: pyFunc[1], type: isMethod ? 'method' : 'function', line: lineNum })
          return
        }
      }

      if (language === 'go') {
        // Go Functions
        const goFunc = trimmed.match(/^func\s+(?:\((?:.*?)\)\s*)?([A-Za-z0-9_]+)\s*\(/)
        if (goFunc) {
          list.push({ name: goFunc[1], type: 'function', line: lineNum })
          return
        }
        
        // Go Structs / Interfaces
        const goType = trimmed.match(/^type\s+([A-Za-z0-9_]+)\s+(struct|interface)/)
        if (goType) {
          list.push({ name: goType[1], type: 'class', line: lineNum })
          return
        }
      }

      if (language === 'html') {
        // Semantic tags
        const tagMatch = trimmed.match(/<(header|main|footer|section|nav|h1|h2|h3|form)\b/i)
        if (tagMatch) {
          // Find id if it exists
          const idMatch = trimmed.match(/id=["']([A-Za-z0-9_-]+)["']/i)
          const name = idMatch ? `<${tagMatch[1]} #${idMatch[1]}>` : `<${tagMatch[1]}>`
          list.push({ name, type: 'tag', line: lineNum })
          return
        }
      }

      if (language === 'css') {
        // CSS Rules
        const cssMatch = trimmed.match(/^([.#][A-Za-z0-9_-]+)\s*\{/) ||
                         trimmed.match(/^([A-Za-z0-9_-]+)\s*\{/)
        if (cssMatch && !trimmed.startsWith('@')) {
          list.push({ name: cssMatch[1], type: 'cssRule', line: lineNum })
          return
        }
      }
    })

    return list
  }, [code, language])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0 12px 10px', flexShrink: 0, borderBottom: `1px solid ${C.glassBorder}`, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.primary }}>
          <Icon name="schema" size={18} color={C.primary} />
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
            OUTLINE
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
            background: 'rgba(142,213,255,0.12)', color: C.primary,
            border: `1px solid rgba(142,213,255,0.25)`, borderRadius: 10, padding: '1px 6px',
          }}>
            {symbols.length} symbols
          </span>
        </div>
      </div>

      {/* Symbols List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }} className="custom-scrollbar">
        {symbols.length === 0 ? (
          <div style={{ padding: '40px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.5, textAlign: 'center' }}>
            <Icon name="info" size={32} color={C.onSurfaceVar} />
            <p style={{ margin: 0, fontSize: 11, color: C.onSurfaceVar, fontFamily: 'Inter, sans-serif' }}>
              No symbols found in this file.<br />
              <span style={{ fontSize: 9, opacity: 0.7 }}>Supports JS, TS, Python, Go, HTML, CSS.</span>
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {symbols.map((sym, idx) => {
              const styleMeta = SYMBOL_STYLES[sym.type] || { icon: 'help', color: C.onSurfaceVar }

              return (
                <div
                  key={idx}
                  onClick={() => onSelectSymbol?.(sym)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.color = C.primary
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'inherit'
                  }}
                >
                  {/* Symbol Type Icon */}
                  <Icon name={styleMeta.icon} size={15} color={styleMeta.color} />

                  {/* Symbol Name */}
                  <span style={{
                    fontSize: 11, fontFamily: '"JetBrains Mono", monospace',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    flex: 1, color: C.onSurface
                  }}>
                    {sym.name}
                  </span>

                  {/* Line Number indicator */}
                  <span style={{
                    fontSize: 9, fontFamily: '"JetBrains Mono", monospace',
                    color: C.onSurfaceVar, opacity: 0.6, flexShrink: 0
                  }}>
                    Ln {sym.line}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
