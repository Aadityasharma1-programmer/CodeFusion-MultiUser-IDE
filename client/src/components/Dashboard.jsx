/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import NewProjectModal from './ui/NewProjectModal'
import { useProjectStore, LANG_LABELS } from '../store/projectStore'
import { executeCode } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import {
  generateCode,
  registerCurrentUser,
  lookupMemberCode,
  loadFriends,
  saveFriends,
} from '../lib/memberCodes'

/* ── colour tokens ── */
const C = {
  bg:              '#131313',
  surfaceContLow:  '#1c1b1b',
  surfaceCont:     '#201f1f',
  surfaceContHigh: '#2a2a2a',
  surfaceContHighest:'#353534',
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

/* ── Coding facts for "Fact for the Day" ── */
const FACTS = [
  "Python was named after the British comedy troupe Monty Python, not the snake. Its creator, Guido van Rossum, was a big fan.",
  "The first computer bug was an actual bug — a moth found trapped in a relay of the Harvard Mark II computer in 1947.",
  "JavaScript was created in just 10 days by Brendan Eich in 1995. It was originally called Mocha, then LiveScript.",
  "Git was created by Linus Torvalds in 2005 to manage the Linux kernel source code after BitKeeper revoked its free license.",
  "The term 'debugging' predates computers — it was used in engineering to describe finding defects in mechanical systems.",
  "TypeScript was released by Microsoft in 2012. It is a strict syntactical superset of JavaScript that adds static typing.",
  "The first high-level programming language was FORTRAN, developed by IBM in 1957 for scientific and engineering computing.",
]

/* ── Icon helper ── */
function Icon({ name, size = 24, fill = 0, style = {}, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined${className ? ' ' + className : ''}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        verticalAlign: 'middle',
        userSelect: 'none',
        ...style,
      }}
    >
      {name}
    </span>
  )
}

export default function Dashboard({ projects, userName, onOpenProject, onNewProject, onLogout }) {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const [myCode, setMyCode] = useState('CF-LOADING')
  const [copiedCode, setCopiedCode] = useState(false)
  const [friends, setFriends] = useState(() => loadFriends())
  const [friendCodeInput, setFriendCodeInput] = useState('')
  const [addFriendError, setAddFriendError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [fact] = useState(() => FACTS[Math.floor(Math.random() * FACTS.length)])

  // Live metrics states
  const [commits, setCommits] = useState(142)
  const [coverage, setCoverage] = useState(94.2)
  const [reviewTime, setReviewTime] = useState(1.2)

  // Navigation states
  const [activeTab, setActiveTab] = useState('explorer') // explorer, search, git, debugger, extensions
  const [topView, setTopView] = useState('dashboard') // dashboard, repos, analytics

  // Modal & Repository action states
  const [friendModalOpen, setFriendModalOpen] = useState(false)
  const [friendProject, setFriendProject] = useState(null)
  const [friendName, setFriendName] = useState('')

  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameProject, setRenameProject] = useState(null)
  const [renameName, setRenameName] = useState('')

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteProjectObj, setDeleteProjectObj] = useState(null)

  // Header popovers
  const [sensorsOpen, setSensorsOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(3)

  // Search tab states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLang, setSearchLang] = useState('all')
  const [searchInside, setSearchInside] = useState(false)

  // Debugger sandbox states
  const [sandboxLang, setSandboxLang] = useState('javascript')
  const [sandboxCode, setSandboxCode] = useState('console.log("Hello from Codefusion Sandbox!");\n\nconst greet = (name) => `Welcome, ${name}!`;\nconsole.log(greet("Developer"));')
  const [sandboxOutput, setSandboxOutput] = useState('Terminal ready. Click Run to execute code in sandboxed runtime.')
  const [sandboxRunning, setSandboxRunning] = useState(false)

  // Extensions states
  const [extensions, setExtensions] = useState(() => {
    try {
      const saved = localStorage.getItem('cf_extensions')
      if (saved) return JSON.parse(saved)
    } catch (_) {}
    return {
      vim: false,
      copilot: true,
      prettier: true,
      linter: true,
    }
  })

  // Store actions
  const updateProject = useProjectStore((s) => s.updateProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const initProjects = useProjectStore((s) => s.initProjects)
  const addCollaborator = useProjectStore((s) => s.addCollaborator)

  useEffect(() => {
    if (user?.id) {
      initProjects()
    }
  }, [user, initProjects])

  useEffect(() => {
    if (user?.id) {
      const uName = profile?.username || user?.email?.split('@')[0] || 'Developer'
      registerCurrentUser(user.id, uName, profile?.avatar_url).then(code => {
        if (code) setMyCode(code)
      })
    }
  }, [user, profile])

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        setCommits(prev => prev + 1)
      }
      setCoverage(prev => {
        const diff = (Math.random() - 0.5) * 0.1
        const next = parseFloat((prev + diff).toFixed(2))
        return next > 99.9 ? 99.9 : next < 90 ? 90 : next
      })
      setReviewTime(prev => {
        const diff = (Math.random() - 0.5) * 0.05
        const next = parseFloat((prev + diff).toFixed(2))
        return next > 3.0 ? 3.0 : next < 0.5 ? 0.5 : next
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleAddFriendSubmit = async (e) => {
    e.preventDefault()
    const code = friendName.trim().toUpperCase()
    if (!code || !friendProject) return
    
    const member = await lookupMemberCode(code)
    if (!member) {
      alert("Invalid Member Code! Collaborators must be registered users.")
      return
    }
    
    // Call the backend API
    const res = await addCollaborator(friendProject, member.userId)
    if (!res.success) {
      alert(`Failed to add collaborator: ${res.error}`)
      return
    }

    // Update local UI
    const team = friendProject.team || []
    const collaboratorName = member.username
    if (!team.includes(collaboratorName)) {
      updateProject(friendProject.id, { team: [...team, collaboratorName] })
    }
    
    setFriendName('')
    setFriendProject(null)
    setFriendModalOpen(false)
  }

  const handleRemoveFriend = (codeToRemove) => {
    const updated = friends.filter(f => f.code !== codeToRemove)
    setFriends(updated)
    saveFriends(updated)
  }

  const handleRenameSubmit = (e) => {
    e.preventDefault()
    if (!renameName.trim() || !renameProject) return
    updateProject(renameProject.id, { name: renameName.trim() })
    setRenameName('')
    setRenameProject(null)
    setRenameModalOpen(false)
  }

  const handleDeleteConfirm = () => {
    if (!deleteProjectObj) return
    deleteProject(deleteProjectObj.id)
    setDeleteProjectObj(null)
    setDeleteConfirmOpen(false)
  }

  const handleSandboxRun = async () => {
    setSandboxRunning(true)
    setSandboxOutput('⏳ Launching sandbox & executing code...')
    try {
      const outputVal = await executeCode(sandboxCode, sandboxLang)
      setSandboxOutput(outputVal || 'No output')
    } catch (err) {
      setSandboxOutput(`❌ Execution error: ${err.response?.data?.error || err.message}`)
    } finally {
      setSandboxRunning(false)
    }
  }

  const updateSandboxDefaultCode = (lang) => {
    setSandboxLang(lang)
    if (lang === 'javascript') {
      setSandboxCode('console.log("Hello from Codefusion Sandbox!");\n\nconst greet = (name) => `Welcome, ${name}!`;\nconsole.log(greet("Developer"));')
    } else if (lang === 'python') {
      setSandboxCode('print("Hello from Codefusion Python Sandbox!")\n\nnames = ["Alex", "Sarah", "Markus"]\nfor name in names:\n    print(f"Collaborator: {name}")')
    } else if (lang === 'go') {
      setSandboxCode('package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello from Go Sandbox!")\n\tfmt.Println("System diagnostics check: OK")\n}')
    }
  }

  const toggleExtension = (key) => {
    const next = { ...extensions, [key]: !extensions[key] }
    setExtensions(next)
    try { localStorage.setItem('cf_extensions', JSON.stringify(next)) } catch (_) {}
  }

  const collaborators = [
    {
      name: 'Alex Rivera',
      status: 'EDITING AETHER-CORE',
      color: C.matrixGreen,
      ring: 'ring-2 ring-matrix-green',
      online: true,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfJxnsCxtU6ULQUEAX9nQq3ZGNQDCZFwjlI3ZvnT03xYW4IPd_fJwVP1gUO48kt6felyS16a0Nr_bI8SHd1iUdtji8iY2bCyiuwYLxFpzzd2fXPsojBBf1kjSMxNwh0kQhx6o66H4CmuYv43vY9ZNnqlZxa4ic5sA-_23dnqv4YVQjRT6ymvUaa30DmdIL9zuoME03QajQ34d7uY8XVPMmwGFi3sIROmkIAQ6yFRlqh0d_w8_NOttBW7XoNAsre37Ulz-6ulTEwk85',
    },
    {
      name: 'Sarah Chen',
      status: 'IDLE',
      color: C.matrixGreen,
      ring: 'ring-2 ring-tertiary',
      online: true,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAJVfHKMHN3IcgFS6HUTi3zkwiI-hm8YgsPvogzwtNlAOc1LjKUGcsZ7GW1MJtoABHkjUz092DMMZoalUoAxYOpEuT2lL52bipACKPfFOKcn5i9_KzCKZyP7qkqhuw5W0JicCQg8fDcF4eycKble92NBL4uZXS9mCcjAumZ8eYVGl-XIEKq2-VSeRZX3SgBNqPfeN2ZTLKI4AlUR7a4B7bAKvzCLk8pWTcggLcdtSuQYIKaxeyc1ib-VMwfPw-wOLHq2ssgjK0AG1h',
    },
    {
      name: 'Markus Vogt',
      status: 'OFFLINE',
      color: C.onSurfaceVar,
      ring: '',
      online: false,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7To5hAeNS-A1egGp3L6U-WgMr9roXX386lYokzRzCxkEz3QVUQ3ve-k5LNtjxswuTEvzUMQNBxJJVL1hvDamDcpMjFwjIA5bG5MVULM40O6wDHDx8nfAUL45VTTTEUK9IyFE_pWINVVT3_cZMqndKcDg3XkCeufE1-ajRbMQ1gCaxLbbk3cRxKldRVXUZzAU48t_pnwFUYPiSP2gFEmUSaHFzrZMmgeI1m_JL5t4HGxWUKZSa1-lwg4D9yXoxbENtldmLjiOYfKIH',
    },
  ]

  // Filter projects for search view
  const searchFilteredProjects = projects.filter(p => {
    const matchesName = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLang = searchLang === 'all' || p.lang === searchLang
    
    if (searchInside && searchQuery) {
      const hasCodeMatch = p.code?.toLowerCase().includes(searchQuery.toLowerCase())
      let hasFileMatch = false
      try {
        const fileCodes = JSON.parse(localStorage.getItem(`cf_codes_${p.id}`) || '{}')
        hasFileMatch = Object.values(fileCodes).some(content => 
          typeof content === 'string' && content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      } catch (_) {}
      return (matchesName || hasCodeMatch || hasFileMatch) && matchesLang
    }
    return matchesName && matchesLang
  })

  // Git feed mockup data
  const gitCommits = projects.flatMap(p => [
    { id: `c1-${p.id}`, project: p.name, author: userName || 'You', message: 'Refactored core modules', time: '10m ago', hash: 'e28b1a2' },
    { id: `c2-${p.id}`, project: p.name, author: 'Alex Rivera', message: 'Fixed layout positioning bugs', time: '2h ago', hash: '8f3a9e1' },
    { id: `c3-${p.id}`, project: p.name, author: 'Sarah Chen', message: 'Add workspace test environment script', time: '1d ago', hash: 'd9b23c4' },
  ]).slice(0, 8)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden', background: C.bg, color: C.onSurface, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Navigation Drawer ── */}
      <aside style={{
        width: 256,
        position: 'fixed',
        left: 0, top: 0,
        height: '100vh',
        background: C.surfaceContLow,
        borderRight: `1px solid ${C.glassBorder}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
        zIndex: 50,
      }}>
        {/* Workspace selector / Profile link */}
        <div 
          onClick={() => navigate('/profile')}
          style={{ padding: '16px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.surfaceContHigh}`, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Edit Profile"
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 40, height: 40,
              borderRadius: '50%',
              border: `2px solid ${C.tertiary}`,
              background: C.surfaceBright,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.primary, fontWeight: 700, fontSize: 16,
              overflow: 'hidden',
            }}>
              {(userName || 'D')[0].toUpperCase()}
            </div>
            <span style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 12, height: 12,
              background: C.matrixGreen,
              border: `2px solid ${C.surfaceContLow}`,
              borderRadius: '50%',
            }} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.primary, lineHeight: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName || 'Lead Dev'}</p>
            <p style={{ fontSize: 12, color: C.onSurfaceVar }}>codefusion / main</p>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 8px', gap: 2 }}>
          {[
            { icon: 'account_tree', label: 'Explorer', id: 'explorer', action: () => { setTopView('dashboard'); setActiveTab('explorer') } },
            { icon: 'forum',        label: 'Chat', id: 'chat', action: () => navigate('/chat') },
            { icon: 'search',       label: 'Search', id: 'search', action: () => { setTopView('dashboard'); setActiveTab('search') } },
            { icon: 'terminal',     label: 'Git', id: 'git', action: () => { setTopView('dashboard'); setActiveTab('git') } },
            { icon: 'bug_report',   label: 'Debugger', id: 'debugger', action: () => { setTopView('dashboard'); setActiveTab('debugger') } },
            { icon: 'extension',    label: 'Extensions', id: 'extensions', action: () => { setTopView('dashboard'); setActiveTab('extensions') } },
            { icon: 'mail',         label: 'Contact Us', id: 'contact', action: () => navigate('/contact') },
          ].map(({ icon, label, id, action }) => {
            const active = topView === 'dashboard' && activeTab === id
            return (
              <a
                key={label}
                onClick={action}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  borderLeft: active ? `2px solid ${C.primary}` : '2px solid transparent',
                  background: active ? 'rgba(142,213,255,0.12)' : 'transparent',
                  color: active ? C.primary : C.onSurfaceVar,
                  fontSize: 14,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.surfaceBright }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <Icon name={icon} size={20} style={{ color: 'inherit' }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14 }}>{label}</span>
              </a>
            )
          })}

          {/* Sign out */}
          <a
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 12px', borderRadius: 8, marginTop: 8,
              cursor: 'pointer', color: C.cyberPink, fontSize: 14,
              borderLeft: '2px solid transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <Icon name="logout" size={20} style={{ color: C.cyberPink }} />
            <span>Sign Out</span>
          </a>
        </nav>
      </aside>

      {/* ── Main Canvas ── */}
      <main style={{ marginLeft: 256, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>

        {/* Top App Bar */}
        <header style={{
          position: 'fixed',
          top: 0, left: 256, right: 0,
          height: 56, zIndex: 50,
          background: 'rgba(19,19,19,0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${C.glassBorder}`,
          boxShadow: '0 0 8px rgba(142,213,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px',
        }}>
          <button 
            onClick={() => { setTopView('dashboard'); setActiveTab('explorer') }} 
            title="Go to Dashboard"
            style={{ 
              display: 'flex', alignItems: 'center', gap: 12, 
              background: 'none', border: 'none', cursor: 'pointer', padding: 0 
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(142,213,255,0.1)',
              boxShadow: '0 0 12px rgba(142,213,255,0.25)',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(142,213,255,0.5)'; e.currentTarget.style.transform = 'scale(1.05)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 12px rgba(142,213,255,0.25)'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              <Icon name="terminal" size={20} fill={1} style={{ color: C.primary }} />
            </div>
            <h1 style={{ fontWeight: 700, fontSize: 20, color: C.primary, margin: 0, letterSpacing: '-0.01em' }}>Codefusion <span style={{ color: C.onSurfaceVar, fontWeight: 400 }}>Dashboard</span></h1>
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', gap: 16, fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
              <span 
                onClick={() => { setTopView('dashboard'); setActiveTab('explorer') }}
                style={{ color: topView === 'dashboard' && activeTab === 'explorer' ? C.primary : C.onSurfaceVar, cursor: 'pointer', transition: 'color 0.2s' }}
              >DASHBOARD</span>
              <span 
                onClick={() => setTopView('repos')}
                style={{ color: topView === 'repos' ? C.primary : C.onSurfaceVar, cursor: 'pointer', transition: 'color 0.2s' }}
              >REPOS</span>
              <span 
                onClick={() => setTopView('analytics')}
                style={{ color: topView === 'analytics' ? C.primary : C.onSurfaceVar, cursor: 'pointer', transition: 'color 0.2s' }}
              >ANALYTICS</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 16, borderLeft: `1px solid ${C.glassBorder}` }}>
              
              {/* User Unique Code Chip */}
              <div 
                onClick={() => {
                  navigator.clipboard.writeText(myCode)
                  setCopiedCode(true)
                  setTimeout(() => setCopiedCode(false), 2000)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${copiedCode ? C.matrixGreen : C.glassBorder}`,
                  padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  marginRight: 8,
                  transition: 'all 0.2s',
                }} 
                title="Click to copy your Unique Member Code"
              >
                {copiedCode ? (
                  <>
                    <span style={{ fontSize: 9, color: C.matrixGreen, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>COPIED!</span>
                    <Icon name="done" size={12} style={{ color: C.matrixGreen }} />
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 9, color: C.onSurfaceVar, fontFamily: 'JetBrains Mono, monospace' }}>ID:</span>
                    <span style={{ fontSize: 11, color: C.primary, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{myCode}</span>
                    <Icon name="content_copy" size={12} style={{ color: C.onSurfaceVar }} />
                  </>
                )}
              </div>
              
              {/* Sensors Popover */}
              <div style={{ position: 'relative' }}>
                <div 
                  onClick={() => { setSensorsOpen(!sensorsOpen); setNotificationsOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 4, borderRadius: '50%', background: sensorsOpen ? 'rgba(255,255,255,0.06)' : 'transparent' }}
                >
                  <Icon name="sensors" size={24} style={{ color: sensorsOpen ? C.primary : C.onSurfaceVar }} />
                </div>

                {sensorsOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setSensorsOpen(false)} />
                    <div className="glass-panel" style={{
                      position: 'absolute', right: 0, top: 36, width: 220,
                      borderRadius: 12, padding: 12, border: `1px solid ${C.glassBorder}`,
                      background: 'rgba(28,27,27,0.95)', backdropFilter: 'blur(12px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 91,
                      display: 'flex', flexDirection: 'column', gap: 8
                    }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: C.primary, letterSpacing: '0.05em' }}>SYSTEM DIAGNOSTICS</p>
                      <div style={{ width: '100%', height: 1, background: C.glassBorder }} />
                      {[
                        { label: 'Sandbox Engine', val: 'Online', color: C.matrixGreen },
                        { label: 'Latency', val: '24ms', color: C.primary },
                        { label: 'Sync Channel', val: 'Connected', color: C.matrixGreen },
                        { label: 'Database Sync', val: 'Nominal', color: C.matrixGreen },
                      ].map(item => (
                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                          <span style={{ color: C.onSurfaceVar }}>{item.label}</span>
                          <span style={{ fontWeight: 600, color: item.color }}>{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Notifications Popover */}
              <div style={{ position: 'relative' }}>
                <div 
                  onClick={() => { setNotificationsOpen(!notificationsOpen); setSensorsOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 4, borderRadius: '50%', background: notificationsOpen ? 'rgba(255,255,255,0.06)' : 'transparent', position: 'relative' }}
                >
                  <Icon name="notifications" size={24} style={{ color: notificationsOpen ? C.primary : C.onSurfaceVar }} />
                  {unreadNotifications > 0 && (
                    <span style={{
                      position: 'absolute', top: 2, right: 2, width: 8, height: 8,
                      borderRadius: '50%', background: C.cyberPink, boxShadow: `0 0 6px ${C.cyberPink}`
                    }} />
                  )}
                </div>

                {notificationsOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setNotificationsOpen(false)} />
                    <div className="glass-panel" style={{
                      position: 'absolute', right: 0, top: 36, width: 280,
                      borderRadius: 12, padding: 12, border: `1px solid ${C.glassBorder}`,
                      background: 'rgba(28,27,27,0.95)', backdropFilter: 'blur(12px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 91,
                      display: 'flex', flexDirection: 'column', gap: 8
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: C.primary, letterSpacing: '0.05em' }}>NOTIFICATIONS ({unreadNotifications})</p>
                        {unreadNotifications > 0 && (
                          <button 
                            onClick={() => setUnreadNotifications(0)}
                            style={{ background: 'none', border: 'none', color: C.cyberPink, fontSize: 9, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                          >
                            CLEAR ALL
                          </button>
                        )}
                      </div>
                      <div style={{ width: '100%', height: 1, background: C.glassBorder }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxH: 220, overflowY: 'auto' }}>
                        {unreadNotifications === 0 ? (
                          <p style={{ fontSize: 12, color: C.onSurfaceVar, textAlign: 'center', margin: '12px 0' }}>No new notifications.</p>
                        ) : (
                          [
                            { text: 'Sarah Chen added you to Aether-Core-UI', time: '10m ago', icon: 'person_add' },
                            { text: 'AI detected security patch for Auth module', time: '1h ago', icon: 'security' },
                            { text: 'Collaborative socket sync established', time: '2h ago', icon: 'sensors' },
                          ].map((notif, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8, padding: 6, borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
                              <Icon name={notif.icon} size={16} style={{ color: C.primary, flexShrink: 0 }} />
                              <div>
                                <p style={{ margin: '0 0 2px 0', fontSize: 11, color: C.onSurface, lineHeight: '14px' }}>{notif.text}</p>
                                <span style={{ fontSize: 9, color: C.onSurfaceVar }}>{notif.time}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div style={{ marginTop: 56, padding: '12px 12px 4px 12px', overflowY: 'auto', flex: 1 }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ── Conditionally Render Main Panel Views ── */}
            {topView === 'repos' ? (
              // Repos View
              <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="folder_open" size={24} style={{ color: C.primary }} />
                    All Repositories ({projects.length})
                  </h3>
                  <button
                    onClick={() => setModalOpen(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: C.primary, color: C.onPrimary,
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      fontFamily: '"JetBrains Mono",monospace', fontSize: 10, fontWeight: 700,
                      cursor: 'pointer', boxShadow: `0 0 15px rgba(142,213,255,0.2)`
                    }}
                  >
                    <Icon name="add" size={14} /> NEW REPO
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {projects.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, border: `2px dashed ${C.glassBorder}`, borderRadius: 12, color: C.onSurfaceVar }}>
                      <Icon name="note_stack" size={48} style={{ color: C.onSurfaceVar, opacity: 0.4 }} />
                      <p style={{ margin: 0 }}>No projects yet.</p>
                      <button onClick={() => setModalOpen(true)} style={{ padding: '8px 16px', background: C.primary, color: C.onPrimary, border: 'none', borderRadius: 8, fontFamily: '"JetBrains Mono",monospace', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>CREATE REPOSITORY</button>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <ProjectCard 
                        key={project.id} 
                        project={project} 
                        onOpen={() => onOpenProject(project.id)} 
                        onAddFriend={() => { setFriendProject(project); setFriendModalOpen(true) }}
                        onRename={() => { setRenameProject(project); setRenameName(project.name); setRenameModalOpen(true) }}
                        onDelete={() => { setDeleteProjectObj(project); setDeleteConfirmOpen(true) }}
                        C={C} 
                      />
                    ))
                  )}
                </div>
              </section>
            ) : topView === 'analytics' ? (
              // Analytics View
              <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon name="insights" size={24} style={{ color: C.primary }} />
                  Global Insights & Analytics
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="glass-panel" style={{ borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.primary }}>Core Quality Indices</h4>
                    {[
                      { label: 'CODE REUSABILITY', val: '84%', fill: 84, color: C.primary },
                      { label: 'TECHNICAL DEBT', val: 'Low (12%)', fill: 12, color: C.cyberPink },
                      { label: 'BUILD STABILITY', val: '98.6%', fill: 98.6, color: C.matrixGreen },
                    ].map(metric => (
                      <div key={metric.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                          <span style={{ color: C.onSurfaceVar }}>{metric.label}</span>
                          <span style={{ color: metric.color }}>{metric.val}</span>
                        </div>
                        <div style={{ width: '100%', height: 6, background: C.surfaceContHigh, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${metric.fill}%`, height: '100%', background: metric.color, borderRadius: 3 }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="glass-panel" style={{ borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.primary }}>Language Distribution</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {[
                        { label: 'JavaScript', pct: '42%', count: `${projects.filter(p=>p.lang==='javascript').length} Repos`, color: C.primary },
                        { label: 'Python', pct: '28%', count: `${projects.filter(p=>p.lang==='python').length} Repos`, color: C.tertiary },
                        { label: 'Go', pct: '18%', count: `${projects.filter(p=>p.lang==='go').length} Repos`, color: C.neonBlue },
                        { label: 'TypeScript', pct: '12%', count: `${projects.filter(p=>p.lang==='typescript').length} Repos`, color: C.cyberPink },
                      ].map(lang => (
                        <div key={lang.label} style={{ flex: '1 1 45%', padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${C.glassBorder}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.onSurface }}>{lang.label}</span>
                            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: lang.color, fontWeight: 700 }}>{lang.pct}</span>
                          </div>
                          <span style={{ fontSize: 10, color: C.onSurfaceVar }}>{lang.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ borderRadius: 12, padding: 24, marginTop: 4 }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600, color: C.primary }}>Recent AI Refactorings</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { change: 'Optimized quadratic loop complexity in parser module', metric: '+12.4% Performance', icon: 'auto_fix_high' },
                      { change: 'Resolved file stream memory leak in server runtime context', metric: 'Memory Leak Fixed', icon: 'security' },
                      { change: 'Auto-generated TypeScript interface declarations', metric: 'Code Quality Index ++', icon: 'code' },
                    ].map((refac, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.01)', borderLeft: `3px solid ${C.primary}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Icon name={refac.icon} size={18} style={{ color: C.primary }} />
                          <span style={{ fontSize: 13, color: C.onSurface }}>{refac.change}</span>
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: C.matrixGreen, fontWeight: 700 }}>{refac.metric}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : (
              // Dashboard View (activeTab conditionals)
              <>
                {/* Hero Greeting — Fact for the Day */}
                {activeTab === 'explorer' && (
                  <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, height: 192 }}>
                    <div className="glass-panel" style={{ borderRadius: 12, padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: '100%', background: 'linear-gradient(to left, rgba(142,213,255,0.04), transparent)', pointerEvents: 'none' }} />
                      <h2 style={{ fontSize: 32, fontWeight: 700, lineHeight: '40px', letterSpacing: '-0.02em', margin: '0 0 8px', color: C.onSurface }}>
                        Fact for the Day
                      </h2>
                      <p style={{ fontSize: 16, color: C.onSurfaceVar, margin: 0, maxWidth: 520 }}>{fact}</p>
                    </div>
                    {/* Quick action / new project card */}
                    <div className="glass-panel" style={{ borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: `1px solid rgba(142,213,255,0.2)`, boxShadow: '0 0 15px rgba(142,213,255,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.primary }}>QUICK ACTION</span>
                        <Icon name="rocket_launch" size={20} fill={1} style={{ color: C.primary }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, color: C.onSurfaceVar, marginBottom: 4 }}>Start Building</p>
                        <p style={{ fontSize: 20, fontWeight: 600, color: C.onSurface, margin: 0 }}>New Project</p>
                      </div>
                      <button
                        onClick={() => setModalOpen(true)}
                        style={{ width: '100%', padding: '8px 0', background: C.primary, color: C.onPrimary, border: 'none', borderRadius: 8, fontFamily: '"JetBrains Mono",monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
                        onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
                      >
                        CREATE PROJECT
                      </button>
                    </div>
                  </section>
                )}

                {/* Dashboard Grid Content */}
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12 }}>

                  {activeTab === 'explorer' && (
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Icon name="folder_open" size={20} style={{ color: C.primary }} />
                            Recent Projects
                          </h3>
                          <button
                            onClick={() => setModalOpen(true)}
                            title="Add New Project"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(142,213,255,0.1)', border: `1px solid rgba(142,213,255,0.25)`,
                              color: C.primary, width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                              transition: 'all 0.2s', padding: 0,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = C.primary
                              e.currentTarget.style.color = C.onPrimary
                              e.currentTarget.style.transform = 'scale(1.1)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(142,213,255,0.1)'
                              e.currentTarget.style.color = C.primary
                              e.currentTarget.style.transform = 'scale(1)'
                            }}
                          >
                            <Icon name="add" size={18} style={{ color: 'inherit' }} />
                          </button>
                        </div>
                      </div>

                      {/* Project Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {projects.length === 0 ? (
                          <div style={{ gridColumn: '1/-1', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, border: `2px dashed ${C.glassBorder}`, borderRadius: 12, color: C.onSurfaceVar }}>
                            <Icon name="note_stack" size={48} style={{ color: C.onSurfaceVar, opacity: 0.4 }} />
                            <p style={{ margin: 0 }}>No projects yet.</p>
                            <button onClick={() => setModalOpen(true)} style={{ padding: '8px 16px', background: C.primary, color: C.onPrimary, border: 'none', borderRadius: 8, fontFamily: '"JetBrains Mono",monospace', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>CREATE YOUR FIRST PROJECT</button>
                          </div>
                        ) : (
                          projects.slice(0, 6).map((project) => (
                            <ProjectCard 
                              key={project.id} 
                              project={project} 
                              onOpen={() => onOpenProject(project.id)} 
                              onAddFriend={() => { setFriendProject(project); setFriendModalOpen(true) }}
                              onRename={() => { setRenameProject(project); setRenameName(project.name); setRenameModalOpen(true) }}
                              onDelete={() => { setDeleteProjectObj(project); setDeleteConfirmOpen(true) }}
                              C={C} 
                            />
                          ))
                        )}
                      </div>
                    </section>
                  )}

                  {activeTab === 'search' && (
                    <section className="glass-panel" style={{ borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon name="search" size={20} style={{ color: C.primary }} />
                        Search Codebase & Repositories
                      </h3>
                      
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Search queries, functions, files..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{
                            flex: 1, background: '#0d0d0d', border: `1px solid ${C.glassBorder}`,
                            borderRadius: 8, padding: '10px 14px', color: C.onSurface, outline: 'none'
                          }}
                        />
                        <select
                          value={searchLang}
                          onChange={(e) => setSearchLang(e.target.value)}
                          style={{
                            background: '#0d0d0d', border: `1px solid ${C.glassBorder}`,
                            borderRadius: 8, padding: '10px 14px', color: C.onSurface, outline: 'none', cursor: 'pointer'
                          }}
                        >
                          <option value="all">All Languages</option>
                          <option value="javascript">JavaScript</option>
                          <option value="typescript">TypeScript</option>
                          <option value="python">Python</option>
                          <option value="go">Go</option>
                        </select>
                      </div>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.onSurfaceVar, cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={searchInside} 
                          onChange={(e) => setSearchInside(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        Search inside project source files (includes local storage sync content)
                      </label>

                      <div style={{ marginTop: 8 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono', color: C.primary, marginBottom: 12 }}>MATCHING REPOS ({searchFilteredProjects.length})</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                          {searchFilteredProjects.length === 0 ? (
                            <p style={{ gridColumn: '1/-1', fontSize: 13, color: C.onSurfaceVar, textAlign: 'center', padding: '24px 0' }}>No search results match your criteria.</p>
                          ) : (
                            searchFilteredProjects.map(p => (
                              <div 
                                key={p.id}
                                onClick={() => onOpenProject(p.id)}
                                className="glass-panel"
                                style={{ padding: 14, borderRadius: 8, cursor: 'pointer', transition: 'border 0.2s', border: `1px solid ${C.glassBorder}` }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: C.primary }}>{p.name}</span>
                                  <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: C.onSurfaceVar }}>{LANG_LABELS[p.lang] || p.lang}</span>
                                </div>
                                <p style={{ fontSize: 11, color: C.onSurfaceVar, margin: 0 }}>Click to launch editor and search workspace</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </section>
                  )}

                  {activeTab === 'git' && (
                    <section className="glass-panel" style={{ borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon name="terminal" size={20} style={{ color: C.primary }} />
                        Centralized Git Activity Feed
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {gitCommits.length === 0 ? (
                          <p style={{ fontSize: 13, color: C.onSurfaceVar, textAlign: 'center', padding: '24px 0' }}>Create a project to generate Git logs.</p>
                        ) : (
                          gitCommits.map((c, i) => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justify: 'space-between', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.glassBorder}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Icon name="commit" size={20} style={{ color: C.primary }} />
                                <div>
                                  <p style={{ margin: '0 0 2px 0', fontSize: 13, fontWeight: 600, color: C.onSurface }}>{c.message}</p>
                                  <span style={{ fontSize: 11, color: C.onSurfaceVar }}>
                                    {c.author} committed to <strong style={{ color: C.primary }}>{c.project}</strong> • {c.time}
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, background: 'rgba(142,213,255,0.1)', color: C.primary, padding: '3px 8px', borderRadius: 4 }}>
                                  main
                                </span>
                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: C.onSurfaceVar }}>
                                  {c.hash}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  )}

                  {activeTab === 'debugger' && (
                    <section className="glass-panel" style={{ borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon name="bug_report" size={20} style={{ color: C.primary }} />
                        Sandbox Runtime & Debugger
                      </h3>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                        {/* Sandbox interactive editor */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono', color: C.onSurfaceVar }}>TEST SCRIPTER</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {['javascript', 'python', 'go'].map(lang => (
                                <button
                                  key={lang}
                                  onClick={() => updateSandboxDefaultCode(lang)}
                                  style={{
                                    background: sandboxLang === lang ? C.primary : 'none',
                                    color: sandboxLang === lang ? C.onPrimary : C.onSurfaceVar,
                                    border: `1px solid ${C.glassBorder}`, borderRadius: 4,
                                    padding: '2px 8px', fontSize: 10, fontFamily: 'JetBrains Mono', cursor: 'pointer'
                                  }}
                                >
                                  {lang.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>

                          <textarea
                            value={sandboxCode}
                            onChange={(e) => setSandboxCode(e.target.value)}
                            style={{
                              width: '100%', height: 160, background: '#0d0d0d',
                              border: `1px solid ${C.glassBorder}`, borderRadius: 8,
                              padding: 12, color: C.onSurface, fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 13, outline: 'none', resize: 'none'
                            }}
                          />

                          <button
                            onClick={handleSandboxRun}
                            disabled={sandboxRunning}
                            style={{
                              background: C.primary, color: C.onPrimary, border: 'none',
                              borderRadius: 8, padding: '10px 0', fontFamily: 'JetBrains Mono',
                              fontWeight: 700, fontSize: 12, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}
                          >
                            <Icon name={sandboxRunning ? 'sync' : 'play_arrow'} size={16} className={sandboxRunning ? 'animate-spin' : ''} />
                            {sandboxRunning ? 'RUNNING SANDBOX...' : 'RUN SANDBOX TEST'}
                          </button>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono', color: C.onSurfaceVar }}>SANDBOX CONSOLE</span>
                            <pre style={{
                              background: '#0d0d0d', border: `1px solid ${C.glassBorder}`,
                              borderRadius: 8, padding: 12, color: C.onSurfaceVar,
                              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, margin: 0,
                              whiteSpace: 'pre-wrap', minHeight: 80, maxHeight: 150, overflowY: 'auto'
                            }}>
                              {sandboxOutput}
                            </pre>
                          </div>
                        </div>

                        {/* Diagnostics Panel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono', color: C.onSurfaceVar }}>RUNTIMES STATUS</span>
                          
                          <div className="glass-panel" style={{ padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                              { key: 'V8 Node.js Runtime', status: 'Healthy', color: C.matrixGreen },
                              { key: 'Python Runtime', status: 'Healthy', color: C.matrixGreen },
                              { key: 'Go Compiler Runtime', status: 'Healthy', color: C.matrixGreen },
                              { key: 'Piston API Engine', status: 'Nominal', color: C.matrixGreen },
                            ].map(item => (
                              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                <span style={{ color: C.onSurfaceVar }}>{item.key}</span>
                                <span style={{ fontWeight: 700, color: item.color }}>{item.status}</span>
                              </div>
                            ))}
                          </div>

                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono', color: C.onSurfaceVar }}>ENVIRONMENT DATA</span>
                          <div className="glass-panel" style={{ padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>Sandbox Memory</span>
                                <span>128MB / 512MB</span>
                              </div>
                              <div style={{ width: '100%', height: 4, background: C.surfaceContHigh, borderRadius: 2 }}>
                                <div style={{ width: '25%', height: '100%', background: C.primary, borderRadius: 2 }} />
                              </div>
                            </div>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>Sandbox CPU Core</span>
                                <span>4.2%</span>
                              </div>
                              <div style={{ width: '100%', height: 4, background: C.surfaceContHigh, borderRadius: 2 }}>
                                <div style={{ width: '5%', height: '100%', background: C.matrixGreen, borderRadius: 2 }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {activeTab === 'extensions' && (
                    <section className="glass-panel" style={{ borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon name="extension" size={20} style={{ color: C.primary }} />
                        Extension Settings & Marketplace
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { key: 'vim', name: 'Monaco Vim Mode', desc: 'Adds Vim keybindings to the editor instance.', icon: 'keyboard' },
                          { key: 'copilot', name: 'Fusion AI Copilot', desc: 'Enables real-time inline AI suggestions and completions.', icon: 'auto_awesome' },
                          { key: 'prettier', name: 'Prettier Code Formatter', desc: 'Auto-formats files on save based on project preferences.', icon: 'format_align_left' },
                          { key: 'linter', name: 'Dynamic Linter & Bug Hunter', desc: 'Analyzes errors and lists problems in real-time.', icon: 'bug_report' },
                        ].map(ext => (
                          <div key={ext.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.glassBorder}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <Icon name={ext.icon} size={24} style={{ color: extensions[ext.key] ? C.primary : C.onSurfaceVar }} />
                              <div>
                                <h4 style={{ margin: '0 0 2px 0', fontSize: 14, fontWeight: 600, color: C.onSurface }}>{ext.name}</h4>
                                <p style={{ margin: 0, fontSize: 11, color: C.onSurfaceVar }}>{ext.desc}</p>
                              </div>
                            </div>
                            
                            {/* Toggle Switch */}
                            <button
                              onClick={() => toggleExtension(ext.key)}
                              style={{
                                width: 44, height: 22, borderRadius: 11,
                                background: extensions[ext.key] ? C.primary : C.surfaceContHighest,
                                border: 'none', cursor: 'pointer', position: 'relative',
                                display: 'flex', alignItems: 'center', transition: 'background 0.2s',
                                padding: 2
                              }}
                            >
                              <div style={{
                                width: 18, height: 18, borderRadius: '50%',
                                background: extensions[ext.key] ? C.onPrimary : C.onSurfaceVar,
                                transform: extensions[ext.key] ? 'translateX(22px)' : 'translateX(0)',
                                transition: 'transform 0.2s, background-color 0.2s',
                              }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Friends Sidebar (Only displayed on default dashboard view) */}
                  {activeTab === 'explorer' && (
                    <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="glass-panel" style={{ borderRadius: 12, padding: 16 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icon name="group" size={20} style={{ color: C.onSurfaceVar }} />
                          Friends
                        </h3>
                        
                        {/* Dynamic Friends List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
                          {friends.length === 0 ? (
                            <p style={{ fontSize: 12, color: C.onSurfaceVar, textAlign: 'center', margin: '16px 0' }}>No friends added yet.</p>
                          ) : (
                            friends.map((friend) => {
                              const isOnline = friend.status === 'online'
                              const statusColor = isOnline ? C.matrixGreen : C.onSurfaceVar
                              return (
                                <div
                                  key={friend.code}
                                  className="friend-row"
                                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 8, transition: 'background 0.15s' }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = C.surfaceBright
                                    const delBtn = e.currentTarget.querySelector('.delete-friend-btn')
                                    if (delBtn) delBtn.style.opacity = '1'
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent'
                                    const delBtn = e.currentTarget.querySelector('.delete-friend-btn')
                                    if (delBtn) delBtn.style.opacity = '0'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <div style={{
                                      width: 30, height: 30, borderRadius: '50%',
                                      border: `2px solid ${statusColor}40`,
                                      background: C.surfaceContHigh,
                                      overflow: 'hidden', flexShrink: 0,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                      {friend.avatarUrl ? (
                                        <img src={friend.avatarUrl} alt={friend.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : (
                                        <span style={{ fontSize: 11, fontWeight: 700, color: C.primary }}>
                                          {friend.username[0].toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <p style={{ fontSize: 13, color: C.onSurface, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{friend.username}</p>
                                      <p style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: C.onSurfaceVar, margin: 0 }}>{friend.code}</p>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <button
                                      className="delete-friend-btn"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveFriend(friend.code)
                                      }}
                                      style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        padding: 2, display: 'flex', alignItems: 'center',
                                        color: C.cyberPink, opacity: 0, transition: 'opacity 0.15s'
                                      }}
                                      title="Remove Friend"
                                    >
                                      <Icon name="delete" size={16} />
                                    </button>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>

                        {/* Add Friend Input Form */}
                        <div style={{ borderTop: `1px solid ${C.glassBorder}`, paddingTop: 12 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono', color: C.primary, marginBottom: 8 }}>ADD FRIEND BY CODE</p>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input
                              type="text"
                              placeholder="CF-XXXXXX"
                              value={friendCodeInput}
                              onChange={(e) => {
                                setFriendCodeInput(e.target.value.toUpperCase())
                                setAddFriendError('')
                              }}
                              style={{
                                flex: 1, background: '#0d0d0d', border: `1px solid ${addFriendError ? C.cyberPink : C.glassBorder}`,
                                borderRadius: 6, padding: '6px 8px', color: C.onSurface, fontSize: 12, outline: 'none',
                                fontFamily: 'JetBrains Mono, monospace'
                              }}
                            />
                            <button
                              onClick={async () => {
                                const code = friendCodeInput.trim().toUpperCase()
                                if (!code) return
                                
                                if (code === myCode) {
                                  setAddFriendError("Can't add yourself")
                                  return
                                }
                                if (friends.some(f => f.code === code)) {
                                  setAddFriendError("Already added")
                                  return
                                }
                                
                                const member = await lookupMemberCode(code)
                                if (!member) {
                                  setAddFriendError("Invalid Code")
                                  return
                                }
                                
                                const newFriend = {
                                  code: member.code,
                                  username: member.username,
                                  avatarUrl: member.avatarUrl,
                                  status: member.status || 'online'
                                }
                                const updated = [...friends, newFriend]
                                setFriends(updated)
                                saveFriends(updated)
                                setFriendCodeInput('')
                                setAddFriendError('')
                              }}
                              style={{
                                background: C.primary, color: C.onPrimary, border: 'none',
                                borderRadius: 6, padding: '0 10px', fontSize: 11, fontWeight: 700,
                                cursor: 'pointer', fontFamily: 'JetBrains Mono'
                              }}
                            >
                              ADD
                            </button>
                          </div>
                          {addFriendError && (
                            <p style={{ fontSize: 10, color: C.cyberPink, margin: '4px 0 0 0' }}>{addFriendError}</p>
                          )}
                        </div>

                      </div>
                    </aside>
                  )}

                </div>
              </>
            )}

          </div>
        </div>

        {/* Stats Strip attached to bottom (replacing footer) */}
        <footer className="glass-panel" style={{
          margin: '0 12px 12px 12px',
          borderRadius: 8,
          padding: '6px 12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 20,
          background: C.surfaceCont,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.15)',
        }}>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: C.matrixGreen,
              boxShadow: `0 0 8px ${C.matrixGreen}`,
              display: 'inline-block',
              animation: 'pulse 2s infinite',
            }} />
            <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 9, fontWeight: 700, color: C.matrixGreen, letterSpacing: '0.1em' }}>LIVE METRICS</span>
          </div>

          <div style={{ width: 1, height: 12, background: C.glassBorder }} />

          {[
            { label: 'COMMITS (24H)', value: commits, color: C.primary },
            { label: 'CODE COVERAGE', value: `${coverage}%`, color: C.matrixGreen },
            { label: 'PR REVIEW TIME', value: `${reviewTime}h`, color: C.onSurface },
          ].map(({ label, value, color }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span style={{ color: C.glassBorder, marginRight: 12 }}>•</span>}
              <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', color: C.onSurfaceVar }}>{label}</span>
              <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 12, fontWeight: 600, color }}>{value}</span>
            </div>
          ))}
        </footer>
      </main>

      {/* Floating chat button */}
      <button 
        onClick={() => navigate('/chat')}
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 56, height: 56,
          background: C.primary, color: C.onPrimary,
          border: 'none', borderRadius: '50%',
          boxShadow: '0 0 20px rgba(142,213,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 50, transition: 'transform 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <Icon name="forum" size={24} fill={1} style={{ color: C.onPrimary }} />
      </button>

      {/* New Project Modal */}
      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={onNewProject} />

      {/* Add Friend Modal */}
      {friendModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,13,13,0.85)', backdropFilter: 'blur(4px)' }} onClick={() => setFriendModalOpen(false)} />
          <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: 400, borderRadius: 16, padding: 24, border: `1px solid rgba(142,213,255,0.2)`, background: 'rgba(32, 31, 31, 0.95)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: C.primary, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="person_add" size={20} style={{ color: C.primary }} />
              Add Friend to Project
            </h3>
            <p style={{ fontSize: 12, color: C.onSurfaceVar, margin: '0 0 20px 0' }}>Add a collaborator to "{friendProject?.name}".</p>
            <form onSubmit={handleAddFriendSubmit}>
              <input
                type="text"
                placeholder="Friend's Unique Code (e.g. CF-SARAH)"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                autoFocus
                required
                style={{
                  width: '100%',
                  background: '#0d0d0d',
                  border: `1px solid ${C.glassBorder}`,
                  borderRadius: 8,
                  padding: 10,
                  color: C.onSurface,
                  fontSize: 14,
                  outline: 'none',
                  marginBottom: 20,
                }}
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setFriendModalOpen(false)}
                  style={{ flex: 1, padding: '10px 0', background: 'none', border: `1px solid ${C.glassBorder}`, borderRadius: 8, color: C.onSurfaceVar, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px 0', background: C.primary, border: 'none', borderRadius: 8, color: C.onPrimary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  ADD MEMBER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,13,13,0.85)', backdropFilter: 'blur(4px)' }} onClick={() => setRenameModalOpen(false)} />
          <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: 400, borderRadius: 16, padding: 24, border: `1px solid rgba(142,213,255,0.2)`, background: 'rgba(32, 31, 31, 0.95)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: C.primary, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="edit" size={20} style={{ color: C.primary }} />
              Rename Project
            </h3>
            <p style={{ fontSize: 12, color: C.onSurfaceVar, margin: '0 0 20px 0' }}>Enter a new name for the repository.</p>
            <form onSubmit={handleRenameSubmit}>
              <input
                type="text"
                placeholder="Repository name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                autoFocus
                required
                style={{
                  width: '100%',
                  background: '#0d0d0d',
                  border: `1px solid ${C.glassBorder}`,
                  borderRadius: 8,
                  padding: 10,
                  color: C.onSurface,
                  fontSize: 14,
                  outline: 'none',
                  marginBottom: 20,
                }}
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setRenameModalOpen(false)}
                  style={{ flex: 1, padding: '10px 0', background: 'none', border: `1px solid ${C.glassBorder}`, borderRadius: 8, color: C.onSurfaceVar, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px 0', background: C.primary, border: 'none', borderRadius: 8, color: C.onPrimary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  RENAME
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,13,13,0.85)', backdropFilter: 'blur(4px)' }} onClick={() => setDeleteConfirmOpen(false)} />
          <div className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: 400, borderRadius: 16, padding: 24, border: `1px solid ${C.cyberPink}`, background: 'rgba(32, 31, 31, 0.95)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: C.cyberPink, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="warning" size={20} style={{ color: C.cyberPink }} />
              Delete Project?
            </h3>
            <p style={{ fontSize: 12, color: C.onSurfaceVar, margin: '0 0 20px 0' }}>
              Are you sure you want to delete <strong>{deleteProjectObj?.name}</strong>? This action is permanent and cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                style={{ flex: 1, padding: '10px 0', background: 'none', border: `1px solid ${C.glassBorder}`, borderRadius: 8, color: C.onSurfaceVar, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                CANCEL
              </button>
              <button
                onClick={handleDeleteConfirm}
                style={{ flex: 1, padding: '10px 0', background: C.cyberPink, border: 'none', borderRadius: 8, color: C.onSurface, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                DELETE PERMANENTLY
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function ProjectCard({ project, onOpen, onRename, onAddFriend, onDelete, C }) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const lang = LANG_LABELS[project.lang] || project.lang || 'JS'

  // Determine status based on project properties
  const getStatus = () => {
    if (project.status === 'issue') return { label: 'ISSUE', color: C.cyberPink, icon: 'security', iconColor: C.cyberPink, bg: 'rgba(244,63,94,0.1)' }
    if (project.status === 'dev')   return { label: 'IN DEV', color: C.neonBlue,   icon: 'data_object', iconColor: C.primary, bg: 'rgba(142,213,255,0.1)' }
    return { label: 'STABLE', color: C.matrixGreen, icon: 'cloud_done', iconColor: C.primary, bg: 'rgba(142,213,255,0.1)' }
  }
  const status = getStatus()

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="glass-panel"
      style={{
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        border: hovered ? `1px solid rgba(142,213,255,0.5)` : '1px solid rgba(255,255,255,0.10)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s',
        boxShadow: hovered ? '0 0 15px rgba(142,213,255,0.10)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', position: 'relative' }}>
        <div style={{ padding: 8, background: status.bg, borderRadius: 8 }}>
          <Icon name={status.icon} size={20} style={{ color: status.iconColor }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: status.color }}>{status.label}</span>
          
          {/* 3-dot context menu button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            style={{
              background: 'none', border: 'none', color: C.onSurfaceVar, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 4, borderRadius: '50%', transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.surfaceContHighest; e.currentTarget.style.color = C.onSurface }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.onSurfaceVar }}
          >
            <Icon name="more_vert" size={18} />
          </button>
        </div>

        {/* Floating Context Menu */}
        {menuOpen && (
          <>
            <div 
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }}
              style={{ position: 'fixed', inset: 0, zIndex: 998 }}
            />
            <div style={{
              position: 'absolute', right: 0, top: 32,
              background: 'rgba(32, 31, 31, 0.95)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${C.glassBorder}`,
              borderRadius: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              zIndex: 999,
              width: 140,
              overflow: 'hidden',
              padding: '4px 0',
            }}>
              {[
                { label: 'Add Friend', icon: 'person_add', action: onAddFriend },
                { label: 'Rename', icon: 'edit', action: onRename },
                { label: 'Delete', icon: 'delete', action: onDelete, color: C.cyberPink },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    item.action()
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'none', border: 'none',
                    color: item.color || C.onSurface,
                    fontSize: 12, textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.surfaceContHighest }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <Icon name={item.icon} size={14} style={{ color: item.color || C.onSurfaceVar }} />
                  <span style={{ fontSize: 12 }}>{item.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <h4 style={{ fontSize: 16, fontWeight: 600, color: hovered ? C.primary : C.onSurface, margin: '0 0 4px', transition: 'color 0.2s' }}>{project.name}</h4>
      <p style={{ fontSize: 12, color: C.onSurfaceVar, margin: '0 0 16px', flex: 1 }}>Workspace instance ready.</p>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div style={{ display: 'flex' }}>
          {(project.team?.length ? project.team : ['You']).map((t, i) => (
            <div 
              key={i} 
              style={{ 
                width: 24, height: 24, borderRadius: '50%', 
                background: C.surfaceBright, border: `1px solid ${C.bg}`, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: 10, fontWeight: 700, color: C.primary, 
                marginLeft: i > 0 ? -8 : 0 
              }}
            >
              {t[0].toUpperCase()}
            </div>
          ))}
        </div>
        <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 12, color: C.onSurfaceVar }}>{lang}</span>
      </div>
    </div>
  )
}
