/* eslint-disable no-unused-vars */
import { useState } from 'react'

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
          size={12}
          fill={i <= Math.round(rating) ? 1 : 0}
          color={i <= Math.round(rating) ? '#F59E0B' : C.onSurfaceVar}
        />
      ))}
    </span>
  )
}

export default function ExtensionDetailView({ extension, onToggleInstall, installing }) {
  const [activeTab, setActiveTab] = useState('details') // 'details' | 'changelog' | 'reviews'

  if (!extension) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.onSurfaceVar }}>
        <span>No extension selected</span>
      </div>
    )
  }

  // Define details, changelogs, and reviews based on extension
  const detailsContent = extension.details || `
### Overview
**${extension.name}** brings powerful capabilities directly into your Codefusion workspace. Tailored for modern developer environments, this extension is designed to run seamlessly, with zero configuration required.

### Features
- 🚀 **High Performance**: Optimized for fast responsiveness.
- ⚙️ **Customizability**: Fully adaptable to your preferences.
- 🛠️ **Seamless Integration**: Hooks directly into Codefusion's layout and terminal.

### Extension Settings
This extension contributes the following settings:
* \`${extension.id}.enabled\`: Enable/disable this extension.
* \`${extension.id}.debugMode\`: Toggle debug logging.
  `

  const changelogContent = extension.changelog || [
    { version: 'v1.2.4', date: '2026-05-18', notes: ['Fixed compatibility issues with React 19', 'Performance improvements in indexing', 'Reduced memory overhead'] },
    { version: 'v1.2.0', date: '2026-03-10', notes: ['Added default configuration templates', 'Enhanced logging output in Debug Console'] },
    { version: 'v1.0.0', date: '2025-12-01', notes: ['Initial release of extension'] }
  ]

  const reviewsContent = extension.reviews || [
    { author: 'Jane Doe', rating: 5, comment: 'Absolutely essential extension. Saves me hours every single day!' },
    { author: 'John Smith', rating: 4, comment: 'Works very well. Clean and beautiful UI implementation.' },
    { author: 'Alex Reed', rating: 5, comment: 'Can\'t imagine using Codefusion without it. Super fast.' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflowY: 'auto', padding: '24px 32px' }} className="custom-scrollbar animate-fade-in">
      
      {/* Extension Header Section */}
      <div style={{ display: 'flex', gap: 24, borderBottom: `1px solid ${C.glassBorder}`, paddingBottom: 24, marginBottom: 20 }}>
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: 16,
          background: `${extension.iconColor}20`,
          border: `1px solid ${extension.iconColor}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon name={extension.icon} size={40} fill={1} color={extension.iconColor} />
        </div>

        {/* Info Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#fff' }}>{extension.name}</h2>
            <span style={{
              fontSize: 9, fontFamily: 'JetBrains Mono', fontWeight: 700,
              background: 'rgba(255,255,255,0.08)', border: `1px solid ${C.glassBorder}`,
              borderRadius: 6, padding: '2px 6px', color: C.onSurfaceVar
            }}>
              {extension.version || 'v1.2.4'}
            </span>
          </div>

          <div style={{ fontSize: 12, color: C.primary, fontWeight: 500, marginBottom: 8 }}>
            {extension.publisher}
          </div>

          <p style={{ margin: 0, fontSize: 13, color: C.onSurfaceVar, lineHeight: '18px', maxWidth: 650 }}>
            {extension.description}
          </p>

          {/* Download and rating bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Stars rating={extension.rating} />
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: C.onSurfaceVar }}>({extension.rating})</span>
            </div>
            <div style={{ width: 1, height: 12, background: C.glassBorder }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.onSurfaceVar, fontFamily: 'JetBrains Mono' }}>
              <Icon name="download" size={13} color={C.onSurfaceVar} />
              <span>{extension.downloads} downloads</span>
            </div>
            <div style={{ width: 1, height: 12, background: C.glassBorder }} />
            <div style={{ fontSize: 11, color: C.onSurfaceVar, fontFamily: 'JetBrains Mono' }}>
              Category: <span style={{ color: C.primary }}>{extension.category}</span>
            </div>
          </div>
        </div>

        {/* Install Button Column */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0 }}>
          <button
            onClick={() => onToggleInstall(extension.id)}
            disabled={installing === extension.id}
            style={{
              padding: '8px 24px',
              background: extension.installed ? 'transparent' : C.primary,
              color: extension.installed ? '#fff' : C.onPrimary,
              border: extension.installed ? `1px solid ${C.cyberPink}` : 'none',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              cursor: installing === extension.id ? 'not-allowed' : 'pointer',
              opacity: installing === extension.id ? 0.6 : 1,
              transition: 'all 0.15s',
              boxShadow: extension.installed ? 'none' : `0 0 16px ${C.primary}30`,
            }}
            onMouseEnter={e => {
              if (installing === extension.id) return
              if (extension.installed) {
                e.currentTarget.style.background = 'rgba(244,63,94,0.1)'
              } else {
                e.currentTarget.style.filter = 'brightness(1.15)'
              }
            }}
            onMouseLeave={e => {
              if (extension.installed) {
                e.currentTarget.style.background = 'transparent'
              } else {
                e.currentTarget.style.filter = 'none'
              }
            }}
          >
            {installing === extension.id
              ? (extension.installed ? 'UNINSTALLING…' : 'INSTALLING…')
              : extension.installed ? 'UNINSTALL' : 'INSTALL'}
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.glassBorder}`, marginBottom: 20 }}>
        {['details', 'changelog', 'reviews'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600,
              color: activeTab === tab ? C.primary : C.onSurfaceVar,
              borderBottom: activeTab === tab ? `2px solid ${C.primary}` : '2px solid transparent',
              marginBottom: -1,
              transition: 'all 0.15s',
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div style={{ flex: 1, color: C.onSurfaceVar, fontSize: 13, lineHeight: '20px' }}>
        
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div style={{ maxWidth: 750 }}>
            {detailsContent.split('\n').map((line, idx) => {
              if (line.startsWith('### ')) {
                return <h4 key={idx} style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 18, marginBottom: 8 }}>{line.replace('### ', '')}</h4>
              }
              if (line.startsWith('- ') || line.startsWith('* ')) {
                return <li key={idx} style={{ marginLeft: 16, marginBottom: 4 }}>{line.substring(2)}</li>
              }
              if (line.trim() === '') return <div key={idx} style={{ height: 8 }} />
              return <p key={idx} style={{ margin: '0 0 8px 0' }}>{line}</p>
            })}
          </div>
        )}

        {/* Changelog Tab */}
        {activeTab === 'changelog' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {changelogContent.map((release, idx) => (
              <div key={idx} style={{ borderBottom: `1px solid rgba(255,255,255,0.05)`, paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'JetBrains Mono' }}>{release.version}</span>
                  <span style={{ fontSize: 10, color: C.onSurfaceVar }}>({release.date})</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {release.notes.map((note, nIdx) => (
                    <li key={nIdx} style={{ fontSize: 12, color: C.onSurface, marginBottom: 4 }}>{note}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 600 }}>
            {reviewsContent.map((rev, idx) => (
              <div key={idx} style={{ padding: 12, background: C.surfaceContLow, border: `1px solid ${C.glassBorder}`, borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.onSurface }}>{rev.author}</span>
                  <Stars rating={rev.rating} />
                </div>
                <p style={{ margin: 0, fontSize: 12, color: C.onSurfaceVar, fontStyle: 'italic' }}>
                  "{rev.comment}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
