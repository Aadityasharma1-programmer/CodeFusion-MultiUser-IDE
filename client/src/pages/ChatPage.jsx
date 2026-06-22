/* eslint-disable react-hooks/purity */
/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { sendAiChat } from '../api/auth'
import { useChatStore } from '../store/chatStore'
import {
  generateCode,
  registerCurrentUser,
  lookupMemberCode,
  loadFriends,
  saveFriends,
} from '../lib/memberCodes'
import { playPopSound } from '../lib/utils'

/* ── Colour tokens ─────────────────────────────────────── */
const C = {
  bg:              '#0D0D0D',
  surface:         '#131313',
  surfaceContLow:  '#1c1b1b',
  surfaceCont:     '#201f1f',
  surfaceContHigh: '#2a2a2a',
  surfaceBright:   '#3a3939',
  onSurface:       '#e5e2e1',
  onSurfaceVar:    '#bdc8d1',
  primary:         '#8ed5ff',
  onPrimary:       '#00354a',
  cyberPink:       '#F43F5E',
  matrixGreen:     '#10B981',
  tertiary:        '#56e5a9',
  glassBorder:     'rgba(255,255,255,0.08)',
  neonBlue:        '#38BDF8',
}

/* ── Helpers ─────────────────────────────────────────────── */
function Icon({ name, size = 20, fill = 0, color, style = {} }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        lineHeight: 1, display: 'inline-block', verticalAlign: 'middle',
        userSelect: 'none', color, ...style,
      }}
    >
      {name}
    </span>
  )
}

function Avatar({ name, src, size = 40, online, ring, isAi }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
  const colors = ['#8ed5ff','#F43F5E','#10B981','#A855F7','#F59E0B','#EC4899','#6366F1','#14B8A6']
  const bg = isAi ? '#8ed5ff' : (colors[name?.charCodeAt(0) % colors.length] || '#8ed5ff')

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: isAi ? 'rgba(142,213,255,0.15)' : (src ? 'transparent' : bg + '30'),
        border: ring ? `2px solid ${ring}` : (isAi ? `2px solid rgba(142,213,255,0.4)` : `2px solid ${bg}40`),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0,
      }}>
        {isAi ? (
          <svg
            role="img"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{
              width: size * 0.55,
              height: size * 0.55,
              color: '#8ed5ff',
            }}
          >
            <path d="M16.778 1.844v1.919q-.569-.026-1.138-.032-.708-.008-1.415.037c-1.93.126-4.023.728-6.149 2.237-2.911 2.066-2.731 1.95-4.14 2.75-.396.223-1.342.574-2.185.798-.841.225-1.753.333-1.751.333v4.229s.768.108 1.61.333c.842.224 1.789.575 2.185.799 1.41.798 1.228.683 4.14 2.75 2.126 1.509 4.22 2.11 6.148 2.236.88.058 1.716.041 2.555.005v1.918l7.222-4.168-7.222-4.17v2.176c-.86.038-1.611.065-2.278.021-1.364-.09-2.417-.357-3.979-1.465-2.244-1.593-2.866-2.027-3.68-2.508.889-.518 1.449-.906 3.822-2.59 1.56-1.109 2.614-1.377 3.978-1.466.667-.044 1.418-.017 2.278.02v2.176L24 6.014Z" />
          </svg>
        ) : src ? (
          <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: size * 0.35, fontWeight: 700, color: bg, fontFamily: 'Inter, sans-serif' }}>{initials}</span>
        )}
      </div>
      {online !== undefined && (
        <span style={{
          position: 'absolute', bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28,
          borderRadius: '50%',
          background: online ? C.matrixGreen : C.surfaceBright,
          border: `2px solid ${C.surface}`,
        }} />
      )}
    </div>
  )
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/* ── Initial Data ────────────────────────────────────── */
const INITIAL_CONTACTS = [
  {
    id: 'ai_assistant', name: 'Gemini 2.5 Flash', role: 'OpenRouter AI', online: true, isAi: true,
    avatar: null,
    messages: [
      { id: 'm1', from: 'ai_assistant', text: 'Hello! I am Gemini 2.5 Flash via OpenRouter. How can I help you with your codebase today?', ts: new Date().toISOString() },
    ],
  },
  {
    id: 'alex_rivera', name: 'Alex Rivera', role: 'Collaborator', online: true, isAi: false,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfJxnsCxtU6ULQUEAX9nQq3ZGNQDCZFwjlI3ZvnT03xYW4IPd_fJwVP1gUO48kt6felyS16a0Nr_bI8SHd1iUdtji8iY2bCyiuwYLxFpzzd2fXPsojBBf1kjSMxNwh0kQhx6o66H4CmuYv43vY9ZNnqlZxa4ic5sA-_23dnqv4YVQjRT6ymvUaa30DmdIL9zuoME03QajQ34d7uY8XVPMmwGFi3sIROmkIAQ6yFRlqh0d_w8_NOttBW7XoNAsre37Ulz-6ulTEwk85',
    messages: [
      { id: 'alex1', from: 'alex_rivera', text: "Hey! Did you check the latest changes to the main server? I'm editing aether-core right now.", ts: new Date(Date.now() - 3600000).toISOString() },
    ]
  },
  {
    id: 'sarah_chen', name: 'Sarah Chen', role: 'Collaborator', online: true, isAi: false,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAJVfHKMHN3IcgFS6HUTi3zkwiI-hm8YgsPvogzwtNlAOc1LjKUGcsZ7GW1MJtoABHkjUz092DMMZoalUoAxYOpEuT2lL52bipACKPfFOKcn5i9_KzCKZyP7qkqhuw5W0JicCQg8fDcF4eycKble92NBL4uZXS9mCcjAumZ8eYVGl-XIEKq2-VSeRZX3SgBNqPfeN2ZTLKI4AlUR7a4B7bAKvzCLk8pWTcggLcdtSuQYIKaxeyc1ib-VMwfPw-wOLHq2ssgjK0AG1h',
    messages: [
      { id: 'sarah1', from: 'sarah_chen', text: "Hi! Ready to collaborate. Let me know if you need any PR review.", ts: new Date(Date.now() - 7200000).toISOString() },
    ]
  }
]

const EMOJI_LIST = ['👍','✅','🔥','💡','🚀','😊','❤️','👀','🎉','💯','😂','🤔','⚡','🛠️','📦','🐛']

const FILE_MOCKUPS = {
  'auth.js': `// Simulated auth.js
import jwt from 'jsonwebtoken';

export function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
}`,
  'schema.sql': `-- PostgreSQL database schema for Codefusion
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  lang VARCHAR(50) DEFAULT 'javascript',
  code TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP DEFAULT NOW()
);`,
  'design.fig': `// Figma Design Annotations & Styles
const STYLES = {
  colors: {
    bg: '#0D0D0D',
    surface: '#131313',
    primary: '#8ed5ff',
    cyberPink: '#F43F5E',
    matrixGreen: '#10B981',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    title: '24px font-weight: 700',
    body: '14px font-weight: 400',
  },
  effects: {
    glass: 'background: rgba(19, 19, 19, 0.7); backdrop-filter: blur(12px)',
  }
};`,
  'api.ts': `// API Route Handlers
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ success: true, data: body });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}`
};

/* ── Chat Page ─────────────────────────────────────────────── */
export default function ChatPage() {
  const navigate  = useNavigate()
  const user      = useAuthStore(s => s.user)
  const toggleMute = useChatStore((s) => s.toggleMute)
  const mutedMap = useChatStore((s) => s.mutedMap)
  const profile   = useAuthStore(s => s.profile)
  const myName    = profile?.username || user?.email?.split('@')[0] || 'You'
  const myCode    = profile?.member_code || generateCode(user?.id)

  const {
    contacts: dbContacts,
    activeContactId,
    messages: dbMessages,
    onlineUsers,
    typingUsers,
    loading: dbLoading,
    init: initChatStore,
    setActiveContact,
    sendMessage: dbSendMessage,
    sendTypingEvent,
    markAsRead,
    addFriendByCode,
    createGroup,
    deleteConversation,
    clearMessages,
  } = useChatStore()

  const [toastMessage, setToastMessage] = useState('')
  const [dialogConfig, setDialogConfig] = useState(null)
  
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(''), 3000)
      return () => clearTimeout(t)
    }
  }, [toastMessage])

  const [aiMessages, setAiMessages] = useState([
    { id: 'm1', from: 'ai_assistant', text: 'Hello! I am Gemini 2.5 Flash via OpenRouter. How can I help you with your codebase today?', ts: new Date().toISOString() },
  ])

  const [activeId, setActiveId] = useState('ai_assistant')
  const [input, setInput]             = useState('')
  const [search, setSearch]           = useState('')
  const [showEmoji, setShowEmoji]     = useState(false)
  const [typing, setTyping]           = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addCodeInput, setAddCodeInput] = useState('')
  const [addFriendError, setAddFriendError] = useState('')
  const [addingFriend, setAddingFriend] = useState(false)

  // Group creation modal states
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupNameInput, setGroupNameInput] = useState('')
  const [selectedFriendIds, setSelectedFriendIds] = useState([])
  const [groupError, setGroupError] = useState('')
  const [creatingGroupState, setCreatingGroupState] = useState(false)

  const [copied, setCopied] = useState(false)
  const [callingState, setCallingState] = useState(null) // 'voice' | 'video' | null
  const [callStatus, setCallStatus] = useState('Initiating...') // 'Ringing...' | 'Connected' | 'Ended'
  const [callDuration, setCallDuration] = useState(0)
  const [msgSearchOpen, setMsgSearchOpen] = useState(false)
  const [msgSearchQuery, setMsgSearchQuery] = useState('')
  const [previewFile, setPreviewFile] = useState(null) // { name: string, content: string } | null

  const [fileMockups, setFileMockups] = useState(FILE_MOCKUPS)
  const [sharedFilesMap, setSharedFilesMap] = useState({
    ai_assistant: ['auth.js', 'schema.sql', 'design.fig', 'api.ts'],
  })
  const [hoveredMsgId, setHoveredMsgId] = useState(null)
  const [localReactions, setLocalReactions] = useState({})
  const [callMicMuted, setCallMicMuted] = useState(false)
  const [callCamOff, setCallCamOff] = useState(false)
  const [callSpeakerMuted, setCallSpeakerMuted] = useState(false)

  useEffect(() => {
    if (user?.id) {
      initChatStore(user.id)
    }
  }, [user?.id, initChatStore])

  useEffect(() => {
    if (activeId !== 'ai_assistant') {
      setActiveContact(activeId)
      markAsRead(activeId) // Mark messages as read when opening chat
    } else {
      setActiveContact(null)
    }
  }, [activeId, setActiveContact, markAsRead])

  useEffect(() => {
    if (activeContactId) {
      setActiveId(activeContactId)
    }
  }, [activeContactId])

  // Fallback: poll for new messages every 3 seconds to bypass Realtime RLS issues
  useEffect(() => {
    let interval;
    if (activeId && activeId !== 'ai_assistant') {
      interval = setInterval(() => {
        // Silently fetch to update state without showing a loading spinner
        useChatStore.getState().fetchMessages(activeId)
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [activeId])

  const toggleReaction = (msgId, emoji) => {
    if (activeId === 'ai_assistant') {
      setAiMessages(prev => prev.map(msg => {
        if (msg.id !== msgId) return msg
        const reactions = { ...msg.reactions }
        const users = reactions[emoji] ? [...reactions[emoji]] : []
        if (users.includes('me')) {
          reactions[emoji] = users.filter(u => u !== 'me')
        } else {
          reactions[emoji] = [...users, 'me']
        }
        if (reactions[emoji].length === 0) {
          delete reactions[emoji]
        }
        return { ...msg, reactions }
      }))
    } else {
      setLocalReactions(prev => {
        const reactions = { ...(prev[msgId] || {}) }
        const users = reactions[emoji] ? [...reactions[emoji]] : []
        if (users.includes('me')) {
          reactions[emoji] = users.filter(u => u !== 'me')
        } else {
          reactions[emoji] = [...users, 'me']
        }
        if (reactions[emoji].length === 0) {
          delete reactions[emoji]
        }
        return { ...prev, [msgId]: reactions }
      })
    }
  }
  
  const fileInputRef = useRef(null)

  const isMuted = !!mutedMap[activeId]
  
  const handleToggleMute = () => {
    toggleMute(activeId)
  }

  const startCall = (type) => {
    setCallingState(type)
  }

  const endCall = () => {
    setCallStatus('Ended')
    setTimeout(() => {
      setCallingState(null)
    }, 1000)
  }

  useEffect(() => {
    if (callingState) {
      setCallStatus('Ringing...')
      setCallDuration(0)
      const connectTimeout = setTimeout(() => {
        setCallStatus('Connected')
      }, 3000)
      return () => clearTimeout(connectTimeout)
    }
  }, [callingState])

  useEffect(() => {
    let interval
    if (callingState && callStatus === 'Connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [callingState, callStatus])

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const openFilePreview = (fileName) => {
    setPreviewFile({
      name: fileName,
      content: fileMockups[fileName] || '// File empty'
    })
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const fileMsg = {
      id: 'file-' + Date.now(),
      from: 'me',
      text: `Shared file: ${file.name}`,
      fileDetails: {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type,
      },
      ts: new Date().toISOString()
    }

    if (activeId === 'ai_assistant') {
      setAiMessages(prev => [...prev, fileMsg])
    } else {
      await dbSendMessage(activeId, `Shared file: ${file.name}`)
    }
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target.result
      setFileMockups(prev => ({
        ...prev,
        [file.name]: content
      }))
    }
    if (file.type.startsWith('text/') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.json') || file.name.endsWith('.py') || file.name.endsWith('.html') || file.name.endsWith('.css') || file.name.endsWith('.sql') || file.name.endsWith('.md')) {
      reader.readAsText(file)
    } else {
      setFileMockups(prev => ({
        ...prev,
        [file.name]: `// Simulated binary file: ${file.name}\n// Size: ${(file.size / 1024).toFixed(1)} KB\n// Type: ${file.type}`
      }))
    }

    setSharedFilesMap(prev => {
      const currentList = prev[activeId] || []
      if (currentList.includes(file.name)) return prev
      return {
        ...prev,
        [activeId]: [...currentList, file.name]
      }
    })
    
    if (activeId === 'ai_assistant') {
      setTyping(true)
      setTimeout(() => {
        const reply = {
          id: 'reply-' + Date.now(),
          from: 'ai_assistant',
          text: `I received the file **${file.name}**. I can analyze its content or help you refactor it if it is a code file!`,
          ts: new Date().toISOString()
        }
        setAiMessages(prev => [...prev, reply])
        setTyping(false)
        playPopSound()
      }, 1500)
    }
  }

  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  const aiContact = {
    id: 'ai_assistant',
    name: 'Gemini 2.5 Flash',
    role: 'OpenRouter AI',
    online: true,
    isAi: true,
    avatar: null,
    messages: aiMessages,
  }

  const sortedDbContacts = [...dbContacts].sort((a, b) => {
    const aLast = a.messages && a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].ts).getTime() : 0
    const bLast = b.messages && b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].ts).getTime() : 0
    return bLast - aLast
  })

  const contacts = [aiContact, ...sortedDbContacts]
  const active   = contacts.find(c => c.id === activeId)
  
  const getMessagesForContact = (contactId) => {
    if (contactId === 'ai_assistant') return aiMessages
    return dbMessages[contactId] || (dbContacts.find(c => c.id === contactId)?.messages || [])
  }

  const messages = getMessagesForContact(activeId)

  const filtered = search
    ? contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : contacts

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (activeId !== 'ai_assistant' && e.target.value.trim() !== '') {
      // Throttle typing event
      if (!window.lastTypingEvent || Date.now() - window.lastTypingEvent > 2000) {
        sendTypingEvent(activeId)
        window.lastTypingEvent = Date.now()
      }
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setShowEmoji(false)
    inputRef.current?.focus()

    if (activeId === 'ai_assistant') {
      const msg = { id: 'msg-' + Date.now(), from: 'me', text, ts: new Date().toISOString() }
      setAiMessages(prev => [...prev, msg])
      setTyping(true)
      try {
        const history = aiMessages.map(m => ({
          role: m.from === 'me' ? 'user' : 'assistant',
          content: m.text
        }))
        history.push({ role: 'user', content: text })
        const response = await sendAiChat({ prompt: text, history, mode: 'chat' })
        const replyMsg = {
          id: 'reply-' + Date.now(),
          from: 'ai_assistant',
          text: response?.reply || 'No response',
          ts: new Date().toISOString(),
        }
        setAiMessages(prev => [...prev, replyMsg])
        playPopSound()
      } catch (err) {
        const errorMsg = {
          id: 'error-' + Date.now(),
          from: 'ai_assistant',
          text: 'Oops, I encountered an error: ' + (err.response?.data?.error || err.message),
          ts: new Date().toISOString()
        }
        setAiMessages(prev => [...prev, errorMsg])
      } finally {
        setTyping(false)
      }
    } else {
      await dbSendMessage(activeId, text)
    }
  }

  const handleAddFriend = async () => {
    const code = addCodeInput.trim().toUpperCase()
    if (!code) return
    setAddingFriend(true)
    setAddFriendError('')
    try {
      await addFriendByCode(code, user?.id)
      setShowAddModal(false)
      setAddCodeInput('')
    } catch (err) {
      setAddFriendError(err.message || 'Error adding friend.')
    } finally {
      setAddingFriend(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!groupNameInput.trim()) {
      setGroupError('Group name is required.')
      return
    }
    if (selectedFriendIds.length === 0) {
      setGroupError('Please select at least one friend.')
      return
    }
    setCreatingGroupState(true)
    setGroupError('')
    try {
      await createGroup(groupNameInput, selectedFriendIds, user?.id)
      setShowGroupModal(false)
      setGroupNameInput('')
      setSelectedFriendIds([])
    } catch (err) {
      setGroupError(err.message || 'Error creating group.')
    } finally {
      setCreatingGroupState(false)
    }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const lastMsg = (c) => {
    const msgs = getMessagesForContact(c.id)
    const m = msgs[msgs.length - 1]
    if (!m) return ''
    const prefix = m.from === 'me' ? 'You: ' : (c.isGroup ? `${m.senderName || 'Someone'}: ` : '')
    return prefix + (m.text.length > 35 ? m.text.slice(0, 35) + '…' : m.text)
  }

  const unread = (c) => {
    const msgs = getMessagesForContact(c.id)
    return Math.max(0, msgs.filter(m => m.from !== 'me').length - 3)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, color: C.onSurface, fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header style={{
        height: 56, flexShrink: 0,
        background: 'rgba(19,19,19,0.9)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${C.glassBorder}`,
        boxShadow: '0 0 8px rgba(142,213,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', zIndex: 50,
      }}>
        {/* Logo — click to go home */}
        <button
          onClick={() => navigate('/')}
          title="Go to Dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, flexShrink: 0,
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
            <Icon name="terminal" size={20} fill={1} color={C.primary} />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: C.primary, margin: 0, letterSpacing: '-0.01em' }}>
            Codefusion <span style={{ color: C.onSurfaceVar, fontWeight: 400 }}>Chat</span>
          </h1>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div 
            onClick={() => {
              navigator.clipboard.writeText(myCode)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? C.matrixGreen : C.glassBorder}`,
              padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
              transition: 'all 0.2s',
            }} 
            title="Click to copy your Friend Code"
          >
            {copied ? (
              <>
                <span style={{ fontSize: 10, color: C.matrixGreen, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>COPIED TO CLIPBOARD!</span>
                <Icon name="done" size={14} color={C.matrixGreen} />
              </>
            ) : (
              <>
                <span style={{ fontSize: 10, color: C.onSurfaceVar, fontFamily: 'JetBrains Mono, monospace' }}>YOUR CODE:</span>
                <span style={{ fontSize: 13, color: C.primary, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{myCode}</span>
                <Icon name="content_copy" size={14} color={C.onSurfaceVar} style={{ marginLeft: 4 }} />
              </>
            )}
          </div>

          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(142,213,255,0.1)', border: '1px solid rgba(142,213,255,0.2)', borderRadius: 20, color: C.primary, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(142,213,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(142,213,255,0.1)'}
          >
            <Icon name="arrow_back" size={14} color={C.primary} /> DASHBOARD
          </button>
          <div 
            onClick={() => navigate('/profile')} 
            style={{ cursor: 'pointer', borderRadius: '50%', border: '2px solid transparent', transition: 'border 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
            title="Edit Profile"
          >
            <Avatar name={myName} size={36} online={true} />
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Contact List ─────────────────────────────────── */}
        <div style={{
          width: 320, flexShrink: 0,
          background: C.surfaceContLow,
          borderRight: `1px solid ${C.glassBorder}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.2s',
        }}>
          {/* Search bar */}
          <div style={{ padding: '12px 12px 8px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Icon name="search" size={16} color={C.onSurfaceVar} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations…"
                style={{
                  width: '100%', background: C.surfaceCont, border: `1px solid ${C.glassBorder}`,
                  borderRadius: 20, padding: '8px 12px 8px 34px',
                  color: C.onSurface, fontSize: 13, outline: 'none',
                  fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Section label */}
          <div style={{ padding: '4px 16px 6px', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.1em', color: C.onSurfaceVar }}>
            ALL MESSAGES
          </div>

          {/* Contacts */}
          <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
            {filtered.map(contact => {
              const isActive = contact.id === activeId
              const last = contact.messages[contact.messages.length - 1]
              const isOnline = contact.isAi ? true : (contact.isGroup ? false : onlineUsers.includes(contact.otherUser?.id))
              const isTyping = activeId !== 'ai_assistant' && contact.otherUser && typingUsers[contact.id]?.[contact.otherUser.id]

              return (
                <div
                  key={contact.id}
                  onClick={() => setActiveId(contact.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', cursor: 'pointer',
                    background: isActive ? 'rgba(142,213,255,0.08)' : 'transparent',
                    borderLeft: isActive ? `3px solid ${C.primary}` : '3px solid transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <Avatar name={contact.name} src={contact.avatar} size={48} online={isOnline} isAi={contact.isAi} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: isActive ? C.primary : C.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {contact.name}
                        {mutedMap[contact.id] && <Icon name="notifications_off" size={14} color={C.onSurfaceVar} />}
                      </span>
                      <div style={{ fontSize: 9, color: last?.from === 'me' ? 'rgba(255,255,255,0.5)' : C.onSurfaceVar, marginTop: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                        {formatTime(last?.ts)}
                        {last?.from === 'me' && !contact?.isAi && last.status && (
                          <span style={{ display: 'flex', alignItems: 'center' }}>
                            {last.status === 'read' ? (
                              <Icon name="done_all" size={12} color={C.primary} />
                            ) : last.status === 'sent' && contact?.otherUser && onlineUsers.includes(contact.otherUser.id) ? (
                              <Icon name="done_all" size={12} color="rgba(255,255,255,0.5)" />
                            ) : (
                              <Icon name="check" size={12} color="rgba(255,255,255,0.5)" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {isTyping ? (
                        <p style={{ fontSize: 12, color: C.primary, margin: 0, fontStyle: 'italic' }}>typing...</p>
                      ) : (
                        <p style={{ fontSize: 12, color: C.onSurfaceVar, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                          {lastMsg(contact)}
                        </p>
                      )}
                      {unread(contact) > 0 && (
                        <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: C.primary, color: C.onPrimary, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
                          {unread(contact)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add Friend and Create Group buttons */}
          <div style={{ padding: 12, borderTop: `1px solid ${C.glassBorder}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {showAddModal ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  autoFocus
                  placeholder="Enter Code (e.g. CF-XXXXXXXX)..."
                  value={addCodeInput}
                  onChange={e => setAddCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
                  maxLength={11}
                  style={{
                    width: '100%', background: C.surfaceContHigh, border: `1px solid ${C.glassBorder}`,
                    borderRadius: 8, padding: '8px 12px', color: C.primary, fontSize: 13, outline: 'none',
                    fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '0.1em'
                  }}
                />
                {addFriendError && (
                  <span style={{ fontSize: 11, color: C.cyberPink, textAlign: 'center' }}>
                    {addFriendError}
                  </span>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    disabled={addingFriend}
                    onClick={() => { setShowAddModal(false); setAddFriendError('') }} 
                    style={{ flex: 1, padding: '8px', background: 'transparent', border: `1px solid ${C.glassBorder}`, borderRadius: 8, color: C.onSurfaceVar, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    CANCEL
                  </button>
                  <button 
                    disabled={addingFriend}
                    onClick={handleAddFriend} 
                    style={{ flex: 1, padding: '8px', background: C.primary, border: 'none', borderRadius: 8, color: C.onPrimary, fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: addingFriend ? 0.6 : 1 }}
                  >
                    {addingFriend ? 'ADDING...' : 'ADD'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => setShowAddModal(true)} style={{
                  width: '100%', padding: '10px', background: 'rgba(142,213,255,0.08)',
                  border: `1px solid rgba(142,213,255,0.2)`, borderRadius: 12,
                  color: C.primary, fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(142,213,255,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(142,213,255,0.08)'}
                >
                  <Icon name="person_add" size={16} color={C.primary} />
                  ADD FRIEND
                </button>
                
                <button onClick={() => setShowGroupModal(true)} style={{
                  width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${C.glassBorder}`, borderRadius: 12,
                  color: C.onSurfaceVar, fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = C.onSurface }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = C.onSurfaceVar }}
                >
                  <Icon name="group_add" size={16} color="inherit" />
                  CREATE GROUP
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Chat Window ──────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

          {/* Chat header */}
          <div style={{
            height: 64, flexShrink: 0,
            background: C.surfaceContLow,
            borderBottom: `1px solid ${C.glassBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px',
          }}>
            {/* Active chat user details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={active?.name} src={active?.avatar} size={40} online={active?.online} isAi={active?.isAi} />
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: C.onSurface }}>{active?.name}</h2>
                <p style={{ fontSize: 11, color: active?.online ? C.matrixGreen : C.onSurfaceVar, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {active?.online ? (
                    <>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.matrixGreen }} />
                      online
                    </>
                  ) : 'offline'}
                </p>
              </div>
            </div>

            {/* Chat header actions */}
            <div style={{ display: 'flex', gap: 4, position: 'relative' }} ref={dropdownRef}>
              {[
                { icon: 'videocam', title: 'Video call', hideOnAi: true, action: () => startCall('video') },
                { icon: 'call',     title: 'Voice call', hideOnAi: true, action: () => startCall('voice') },
                { icon: 'search',   title: 'Search in conversation', action: () => { setMsgSearchOpen(p => !p); setMsgSearchQuery('') } },
              ].filter(b => !(b.hideOnAi && active?.isAi)).map(({ icon, title, action }) => (
                <button key={icon} title={title} onClick={action} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: 8, color: C.onSurfaceVar, display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.surfaceBright; e.currentTarget.style.color = C.primary }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.onSurfaceVar }}
                >
                  <Icon name={icon} size={22} color="inherit" />
                </button>
              ))}

              <button title="More options" onClick={() => setShowDropdown(p => !p)} style={{ background: showDropdown ? C.surfaceBright : 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: 8, color: showDropdown ? C.primary : C.onSurfaceVar, display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = C.surfaceBright; e.currentTarget.style.color = C.primary }}
                onMouseLeave={e => { if(!showDropdown) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.onSurfaceVar } }}
              >
                <Icon name="more_vert" size={22} color="inherit" />
              </button>

              {showDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: C.surfaceContHigh, border: `1px solid ${C.glassBorder}`,
                  borderRadius: 12, padding: 8, minWidth: 200, zIndex: 100,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}>
                  <button onClick={() => {
                    setShowDropdown(false)
                    setDialogConfig({
                      title: 'Clear Chat History',
                      message: 'Are you sure you want to clear all messages in this chat? This cannot be undone.',
                      confirmText: 'Clear',
                      onConfirm: async () => {
                        if (activeId === 'ai_assistant') {
                          setAiMessages([])
                        } else {
                          try {
                             await clearMessages(activeId)
                             setToastMessage('Messages cleared')
                          } catch (err) {
                             setToastMessage('Error clearing messages: ' + err.message)
                          }
                        }
                        setDialogConfig(null)
                      }
                    })
                  }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', color: C.onSurface, fontSize: 13, cursor: 'pointer', borderRadius: 6, transition: 'background 0.15s', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surfaceBright}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Icon name="clear_all" size={18} color={C.onSurfaceVar} />
                    Clear Chat
                  </button>

                  <button onClick={() => {
                    setShowDropdown(false)
                    handleToggleMute()
                    setToastMessage(isMuted ? 'Conversation unmuted' : 'Conversation muted')
                  }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', color: C.onSurface, fontSize: 13, cursor: 'pointer', borderRadius: 6, transition: 'background 0.15s', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surfaceBright}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Icon name={isMuted ? "notifications_active" : "notifications_off"} size={18} color={C.onSurfaceVar} />
                    {isMuted ? 'Unmute Chat' : 'Mute Chat'}
                  </button>

                  {!active?.isAi && (
                    <button onClick={() => {
                      setShowDropdown(false)
                      setDialogConfig({
                        title: 'Delete Conversation',
                        message: 'Are you sure you want to delete this conversation?',
                        confirmText: 'Delete',
                        onConfirm: async () => {
                          try {
                            await deleteConversation(activeId)
                            setDialogConfig(null)
                          } catch (err) {
                            setToastMessage('Error deleting conversation: ' + err.message)
                            setDialogConfig(null)
                          }
                        }
                      })
                    }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', color: C.cyberPink, fontSize: 13, cursor: 'pointer', borderRadius: 6, transition: 'background 0.15s', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <Icon name="delete" size={18} color="inherit" />
                      Delete Chat
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search input inside chat area */}
          {msgSearchOpen && (
            <div style={{
              padding: '8px 24px',
              background: C.surfaceContLow,
              borderBottom: `1px solid ${C.glassBorder}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Icon name="search" size={18} color={C.onSurfaceVar} />
              <input
                autoFocus
                value={msgSearchQuery}
                onChange={e => setMsgSearchQuery(e.target.value)}
                placeholder="Search conversation history..."
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: C.onSurface, fontSize: 13, outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
              {msgSearchQuery && (
                <button
                  onClick={() => setMsgSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.onSurfaceVar }}
                >
                  <Icon name="close" size={18} color={C.onSurfaceVar} />
                </button>
              )}
            </div>
          )}

          {/* Messages area */}
          <div
            style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 2 }}
            className="custom-scrollbar"
          >
            {/* Date divider */}
            <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.1em', color: C.onSurfaceVar, background: C.surfaceCont, padding: '3px 12px', borderRadius: 12 }}>
                TODAY
              </span>
            </div>

            {messages.filter(m => m.text?.toLowerCase().includes(msgSearchQuery.toLowerCase())).map((msg, i) => {
              const isMe = msg.from === 'me'
              const senderName = isMe ? 'You' : (active?.isAi ? active.name : (msg.senderName || 'Collaborator'))
              const senderAvatar = isMe ? null : (active?.isAi ? null : msg.senderAvatar)
              const showAvatar = !isMe && (i === 0 || messages[i - 1]?.from !== msg.from)
              const showName = !isMe && active?.isGroup && showAvatar

              // Check if it is a shared file message
              const isFile = msg.text?.startsWith('Shared file: ')
              const fileName = isFile ? msg.text.replace('Shared file: ', '') : null
              const fileDetails = isFile ? { name: fileName, size: 'Simulated' } : msg.fileDetails

              return (
                <div key={msg.id} style={{
                  display: 'flex',
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  alignItems: 'flex-end', gap: 10,
                  marginTop: i > 0 && messages[i - 1]?.from !== msg.from ? 12 : 2,
                }}>
                  {/* Avatar (for others) */}
                  {!isMe && (
                    <div style={{ width: 36, flexShrink: 0 }}>
                      {showAvatar && <Avatar name={senderName} src={senderAvatar} size={36} isAi={active?.isAi} />}
                    </div>
                  )}

                  <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
                    {showName && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, marginLeft: 4 }}>{senderName}</span>
                    )}

                    <div 
                      onMouseEnter={() => setHoveredMsgId(msg.id)}
                      onMouseLeave={() => setHoveredMsgId(null)}
                      style={{ position: 'relative', maxWidth: '100%' }}
                    >
                      {/* Bubble */}
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                        background: isMe
                          ? 'linear-gradient(135deg, rgba(142,213,255,0.25), rgba(56,189,248,0.15))'
                          : C.surfaceContHigh,
                        border: isMe ? '1px solid rgba(142,213,255,0.3)' : `1px solid ${C.glassBorder}`,
                        color: C.onSurface,
                        fontSize: 14,
                        lineHeight: '1.5',
                        wordBreak: 'break-word',
                        boxShadow: isMe ? '0 2px 12px rgba(142,213,255,0.08)' : '0 2px 8px rgba(0,0,0,0.2)',
                      }}>
                        {fileDetails ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Icon name="insert_drive_file" size={32} color={C.primary} />
                            <div style={{ textAlign: 'left' }}>
                              <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{fileDetails.name}</p>
                              <p style={{ margin: 0, fontSize: 10, color: C.onSurfaceVar }}>{fileDetails.size}</p>
                            </div>
                            <button
                              title="Download simulated file"
                              onClick={() => setToastMessage(`Simulating download of ${fileDetails.name}`)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.primary }}
                            >
                              <Icon name="download" size={18} color="inherit" />
                            </button>
                          </div>
                        ) : (
                          msg.text
                        )}
                      </div>

                      {/* Hover Reaction Menu */}
                      {hoveredMsgId === msg.id && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          right: isMe ? 0 : 'auto',
                          left: isMe ? 'auto' : 0,
                          marginBottom: 4,
                          background: C.surfaceBright,
                          border: `1px solid ${C.glassBorder}`,
                          borderRadius: 12,
                          padding: '2px 6px',
                          display: 'flex',
                          gap: 4,
                          zIndex: 10,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                        }}>
                          {['👍', '❤️', '🔥', '🚀', '💡'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              style={{
                                background: 'none', border: 'none', padding: 2,
                                fontSize: 14, cursor: 'pointer', transition: 'transform 0.1s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Displayed reaction pills */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div style={{
                          display: 'flex',
                          gap: 4,
                          marginTop: 4,
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                          flexWrap: 'wrap'
                        }}>
                          {Object.entries(msg.reactions).map(([emoji, users]) => {
                            if (!users || users.length === 0) return null
                            const hasReacted = users.includes('me')
                            return (
                              <div
                                key={emoji}
                                onClick={() => toggleReaction(msg.id, emoji)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  background: hasReacted ? 'rgba(142,213,255,0.15)' : C.surfaceCont,
                                  border: `1px solid ${hasReacted ? C.primary : C.glassBorder}`,
                                  borderRadius: 8,
                                  padding: '2px 6px',
                                  fontSize: 11,
                                  cursor: 'pointer',
                                  color: hasReacted ? C.primary : C.onSurfaceVar,
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                                onMouseLeave={e => e.currentTarget.style.borderColor = hasReacted ? C.primary : C.glassBorder}
                              >
                                <span>{emoji}</span>
                                <span>{users.length}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Timestamp + read indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px' }}>
                      <span style={{ fontSize: 10, color: C.onSurfaceVar }}>{formatTime(msg.ts)}</span>
                      {isMe && !active?.isAi && (
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                            {msg.status === 'read' ? (
                              <Icon name="done_all" size={12} color={C.primary} />
                            ) : msg.status === 'sent' && active?.online ? (
                              <Icon name="done_all" size={12} color="rgba(255,255,255,0.5)" />
                            ) : (
                              <Icon name="check" size={12} color="rgba(255,255,255,0.5)" />
                            )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            {typing && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 12 }}>
                <Avatar name={active?.name} src={active?.avatar} size={36} isAi={active?.isAi} />
                <div style={{
                  padding: '14px 18px', borderRadius: '4px 18px 18px 18px',
                  background: C.surfaceContHigh, border: `1px solid ${C.glassBorder}`,
                  display: 'flex', gap: 5, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: C.matrixGreen,
                      animation: `bounce 1.2s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Emoji picker */}
          {showEmoji && (
            <div style={{
              position: 'absolute', bottom: 80, left: 24,
              background: C.surfaceCont, border: `1px solid ${C.glassBorder}`,
              borderRadius: 16, padding: 16, zIndex: 99,
              boxShadow: '0 -4px 32px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(12px)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
                {EMOJI_LIST.map(emoji => (
                  <button key={emoji}
                    onClick={() => setInput(prev => prev + emoji)}
                    style={{
                      background: 'none', border: 'none', fontSize: 20,
                      cursor: 'pointer', padding: 6, borderRadius: 8,
                      transition: 'transform 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input container */}
          <div style={{
            padding: '16px 24px',
            background: C.surfaceContLow,
            borderTop: `1px solid ${C.glassBorder}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            {/* Attach + Emoji */}
            <div style={{ display: 'flex', gap: 4, paddingBottom: 4 }}>
              <button 
                title="Attach file" 
                onClick={() => fileInputRef.current?.click()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: C.onSurfaceVar }}
                onMouseEnter={e => { e.currentTarget.style.background = C.surfaceBright; e.currentTarget.style.color = C.primary }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.onSurfaceVar }}
              >
                <Icon name="attach_file" size={22} color="inherit" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button title="Emoji" onClick={() => setShowEmoji(p => !p)}
                style={{ background: showEmoji ? C.surfaceBright : 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: showEmoji ? C.primary : C.onSurfaceVar }}
                onMouseEnter={e => { e.currentTarget.style.background = C.surfaceBright; e.currentTarget.style.color = C.primary }}
                onMouseLeave={e => { if (!showEmoji) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.onSurfaceVar } }}
              >
                <Icon name="mood" size={22} color="inherit" />
              </button>
            </div>

            {/* Message input */}
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={`Message ${active?.name || ''}…`}
                rows={1}
                style={{
                  width: '100%', background: C.surfaceCont,
                  border: `1px solid ${C.glassBorder}`,
                  borderRadius: 24, padding: '12px 18px',
                  color: C.onSurface, fontSize: 14,
                  outline: 'none', resize: 'none',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  lineHeight: 1.5, maxHeight: 120, boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(142,213,255,0.4)'}
                onBlur={e => e.target.style.borderColor = C.glassBorder}
                onInput={e => {
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: input.trim() ? C.primary : C.surfaceBright,
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: input.trim() ? '0 0 16px rgba(142,213,255,0.3)' : 'none',
              }}
              onMouseEnter={e => { if (input.trim()) e.currentTarget.style.filter = 'brightness(1.15)' }}
              onMouseLeave={e => e.currentTarget.style.filter = 'none'}
            >
              <Icon name="send" size={20} fill={1} color={input.trim() ? C.onPrimary : C.onSurfaceVar} />
            </button>
          </div>
        </div>

        {/* ── Info Panel (right, hidden on small screens) ──── */}
        <div style={{
          width: 280, flexShrink: 0,
          background: C.surfaceContLow,
          borderLeft: `1px solid ${C.glassBorder}`,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', padding: '24px 0',
        }} className="custom-scrollbar">
          {/* Contact info */}
          <div style={{ textAlign: 'center', padding: '0 24px 20px', borderBottom: `1px solid ${C.glassBorder}` }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <Avatar name={active?.name} src={active?.avatar} size={80} online={active?.online} ring={active?.online ? C.matrixGreen : undefined} isAi={active?.isAi} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.onSurface, margin: '0 0 4px' }}>{active?.name}</h3>
            <p style={{ fontSize: 12, color: C.onSurfaceVar, margin: '0 0 16px' }}>{active?.role}</p>
            {!active?.isAi && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                {[
                  { icon: 'call', label: 'Call', action: () => startCall('voice') },
                  { icon: 'videocam', label: 'Video', action: () => startCall('video') },
                  { icon: 'delete', label: 'Delete', action: () => {
                    setDialogConfig({
                      title: 'Delete Conversation',
                      message: 'Are you sure you want to delete this conversation?',
                      confirmText: 'Delete',
                      onConfirm: async () => {
                        try {
                          await deleteConversation(activeId)
                          setDialogConfig(null)
                        } catch (err) {
                          setToastMessage('Error deleting conversation: ' + err.message)
                          setDialogConfig(null)
                        }
                      }
                    })
                  } },
                ].map(({ icon, label, action }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <button 
                      onClick={action}
                      style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'rgba(142,213,255,0.1)',
                        border: '1px solid rgba(142,213,255,0.2)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(142,213,255,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(142,213,255,0.1)'}
                    >
                      <Icon name={icon} size={20} color={C.primary} />
                    </button>
                    <span style={{ fontSize: 10, color: C.onSurfaceVar }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Media / Shared files placeholder */}
          <div style={{ padding: '20px 20px 0' }}>
            <h4 style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.1em', color: C.onSurfaceVar, margin: '0 0 12px' }}>SHARED FILES</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(sharedFilesMap[activeId] || []).map(f => (
                <div key={f}
                  onClick={() => openFilePreview(f)}
                  style={{
                    background: C.surfaceCont, border: `1px solid ${C.glassBorder}`,
                    borderRadius: 10, padding: '10px 12px',
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surfaceContHigh}
                  onMouseLeave={e => e.currentTarget.style.background = C.surfaceCont}
                >
                  <Icon name="insert_drive_file" size={18} color={C.primary} />
                  <span style={{ fontSize: 11, color: C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                </div>
              ))}
            </div>

            <h4 style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.1em', color: C.onSurfaceVar, margin: '20px 0 12px' }}>NOTIFICATIONS</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.glassBorder}` }}>
              <span style={{ fontSize: 13, color: C.onSurface }}>Mute conversation</span>
              <div 
                onClick={handleToggleMute}
                style={{
                  width: 40, height: 22, borderRadius: 11,
                  background: isMuted ? C.matrixGreen : C.surfaceBright,
                  position: 'relative', cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute',
                  right: isMuted ? 2 : 'auto',
                  left: isMuted ? 'auto' : 2,
                  top: 2, width: 18, height: 18,
                  borderRadius: '50%', background: 'white',
                  transition: 'all 0.2s',
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calling Overlay */}
      {callingState && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(13,13,13,0.92)',
          backdropFilter: 'blur(20px)',
          zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: C.onSurface,
          fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <div style={{
              width: 140, height: 140, borderRadius: '50%',
              background: 'rgba(142,213,255,0.1)',
              border: `2px solid ${C.primary}`,
              boxShadow: '0 0 30px rgba(142,213,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulse 1.5s infinite',
            }}>
              <Avatar name={active?.name} src={active?.avatar} size={120} isAi={active?.isAi} />
            </div>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>{active?.name}</h2>
          <p style={{ fontSize: 16, color: callStatus === 'Connected' ? C.matrixGreen : C.primary, margin: '0 0 40px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {callStatus === 'Connected' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.matrixGreen, display: 'inline-block', animation: 'pulse 1s infinite' }} />}
            {callStatus === 'Connected' ? `In Call: ${formatDuration(callDuration)}` : callStatus}
          </p>

          {/* Simulated webcam video feed */}
          {callingState === 'video' && callStatus === 'Connected' && (
            <div style={{
              width: '80%', maxWidth: 540, height: 300,
              background: '#000', borderRadius: 16,
              border: `1px solid ${C.glassBorder}`,
              position: 'relative', overflow: 'hidden',
              marginBottom: 32, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}>
              {active?.avatar ? (
                <img src={active.avatar} alt={active.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6, filter: 'blur(1px)' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surfaceContLow }}>
                  <Icon name="person" size={80} color={C.onSurfaceVar} />
                </div>
              )}
              
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: C.matrixGreen, background: 'rgba(0,0,0,0.75)', padding: '6px 16px', borderRadius: 20, border: `1px solid ${C.matrixGreen}40` }}>
                  SIMULATED VIDEO STREAMING
                </span>
              </div>

              {/* Local self preview */}
              {!callCamOff && (
                <div style={{
                  position: 'absolute', bottom: 12, right: 12,
                  width: 110, height: 80, borderRadius: 8,
                  background: C.surface, border: `2px solid ${C.primary}`,
                  overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="face" size={20} color={C.primary} style={{ animation: 'pulse 1.5s infinite' }} />
                    <span style={{ fontSize: 8, color: C.primary, marginTop: 4 }}>You (Live)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button
              onClick={() => setCallMicMuted(p => !p)}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: callMicMuted ? C.cyberPink : 'rgba(255,255,255,0.1)',
                border: `1px solid ${C.glassBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', cursor: 'pointer', transition: 'all 0.15s',
              }}
              title={callMicMuted ? "Unmute Mic" : "Mute Mic"}
            >
              <Icon name={callMicMuted ? "mic_off" : "mic"} size={20} color="white" />
            </button>

            <button
              onClick={() => setCallCamOff(p => !p)}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: callCamOff ? C.cyberPink : 'rgba(255,255,255,0.1)',
                border: `1px solid ${C.glassBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', cursor: 'pointer', transition: 'all 0.15s',
              }}
              title={callCamOff ? "Turn Video On" : "Turn Video Off"}
            >
              <Icon name={callCamOff ? "videocam_off" : "videocam"} size={20} color="white" />
            </button>

            <button
              onClick={() => setCallSpeakerMuted(p => !p)}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: callSpeakerMuted ? C.cyberPink : 'rgba(255,255,255,0.1)',
                border: `1px solid ${C.glassBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', cursor: 'pointer', transition: 'all 0.15s',
              }}
              title={callSpeakerMuted ? "Unmute Speaker" : "Mute Speaker"}
            >
              <Icon name={callSpeakerMuted ? "volume_off" : "volume_up"} size={20} color="white" />
            </button>

            <div style={{ width: 1, height: 32, background: C.glassBorder, margin: '0 8px' }} />

            <button
              onClick={endCall}
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: C.cyberPink, border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(244,63,94,0.3)',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              title="End Call"
            >
              <Icon name="call_end" size={28} color="white" />
            </button>
          </div>
        </div>
      )}

      {/* Shared File Preview Modal */}
      {previewFile && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="glass-panel shadow-2xl" style={{
            width: '90%', maxWidth: 700,
            borderRadius: 16, background: C.surface,
            border: `1px solid ${C.glassBorder}`,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.glassBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name="insert_drive_file" size={22} color={C.primary} />
                <span style={{ fontWeight: 700, fontSize: 16, color: C.onSurface }}>{previewFile.name}</span>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.onSurfaceVar, display: 'flex', alignItems: 'center' }}
              >
                <Icon name="close" size={22} color="inherit" />
              </button>
            </div>
            <pre style={{
              margin: 0, padding: 20,
              background: '#070707',
              color: '#a9b1d6',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 13, overflow: 'auto', maxHeight: 400,
              textAlign: 'left',
              lineHeight: 1.6,
            }}>
              <code>{previewFile.content}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showGroupModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="glass-panel shadow-2xl" style={{
            width: '90%', maxWidth: 450,
            borderRadius: 16, background: C.surface,
            border: `1px solid ${C.glassBorder}`,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.glassBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name="group_add" size={22} color={C.primary} />
                <span style={{ fontWeight: 700, fontSize: 16, color: C.onSurface }}>Create New Group</span>
              </div>
              <button
                onClick={() => { setShowGroupModal(false); setGroupError(''); setSelectedFriendIds([]) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.onSurfaceVar, display: 'flex', alignItems: 'center' }}
              >
                <Icon name="close" size={22} color="inherit" />
              </button>
            </div>
            
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Group Name input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: C.onSurfaceVar }}>GROUP NAME</label>
                <input
                  autoFocus
                  placeholder="Enter group name..."
                  value={groupNameInput}
                  onChange={e => setGroupNameInput(e.target.value)}
                  style={{
                    width: '100%', background: C.surfaceContHigh, border: `1px solid ${C.glassBorder}`,
                    borderRadius: 8, padding: '10px 12px', color: C.onSurface, fontSize: 14, outline: 'none',
                    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Friend Selection List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: C.onSurfaceVar }}>SELECT MEMBERS</label>
                <div style={{
                  maxHeight: 200, overflowY: 'auto', background: C.surfaceContLow,
                  border: `1px solid ${C.glassBorder}`, borderRadius: 8,
                  padding: 8, display: 'flex', flexDirection: 'column', gap: 4
                }} className="custom-scrollbar">
                  {dbContacts.filter(c => !c.isGroup && c.otherUser).length === 0 ? (
                    <span style={{ fontSize: 12, color: C.onSurfaceVar, padding: 12, textAlign: 'center' }}>
                      No friends found. Add friends first!
                    </span>
                  ) : (
                    dbContacts.filter(c => !c.isGroup && c.otherUser).map(friend => {
                      const isSelected = selectedFriendIds.includes(friend.otherUser.id)
                      return (
                        <div
                          key={friend.id}
                          onClick={() => {
                            setSelectedFriendIds(prev =>
                              isSelected
                                ? prev.filter(id => id !== friend.otherUser.id)
                                : [...prev, friend.otherUser.id]
                            )
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                            background: isSelected ? 'rgba(142,213,255,0.08)' : 'transparent',
                            transition: 'background 0.15s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            style={{ cursor: 'pointer' }}
                          />
                          <Avatar name={friend.name} src={friend.avatar} size={30} />
                          <span style={{ fontSize: 13, color: isSelected ? C.primary : C.onSurface }}>
                            {friend.name}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {groupError && (
                <span style={{ fontSize: 12, color: C.cyberPink }}>{groupError}</span>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  disabled={creatingGroupState}
                  onClick={() => { setShowGroupModal(false); setGroupError(''); setSelectedFriendIds([]) }}
                  style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${C.glassBorder}`, borderRadius: 8, color: C.onSurfaceVar, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  CANCEL
                </button>
                <button
                  disabled={creatingGroupState || dbContacts.filter(c => !c.isGroup && c.otherUser).length === 0}
                  onClick={handleCreateGroup}
                  style={{ flex: 1, padding: '10px', background: C.primary, border: 'none', borderRadius: 8, color: C.onPrimary, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (creatingGroupState || dbContacts.filter(c => !c.isGroup && c.otherUser).length === 0) ? 0.6 : 1 }}
                >
                  {creatingGroupState ? 'CREATING...' : 'CREATE GROUP'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: C.surfaceContHigh, color: C.onSurface,
          padding: '12px 24px', borderRadius: 8,
          border: `1px solid ${C.glassBorder}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          zIndex: 2000,
          fontFamily: 'Inter, sans-serif', fontSize: 14,
        }}>
          {toastMessage}
        </div>
      )}

      {/* Confirmation Dialog */}
      {dialogConfig && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="glass-panel shadow-2xl" style={{
            width: '90%', maxWidth: 400,
            borderRadius: 16, background: C.surface,
            border: `1px solid ${C.glassBorder}`,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '20px 24px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, color: C.onSurface }}>{dialogConfig.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: C.onSurfaceVar, lineHeight: 1.5 }}>{dialogConfig.message}</p>
            </div>
            <div style={{ display: 'flex', borderTop: `1px solid ${C.glassBorder}` }}>
              <button
                onClick={() => setDialogConfig(null)}
                style={{ flex: 1, padding: 16, background: 'none', border: 'none', borderRight: `1px solid ${C.glassBorder}`, color: C.onSurfaceVar, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={dialogConfig.onConfirm}
                style={{ flex: 1, padding: 16, background: 'none', border: 'none', color: C.cyberPink, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                {dialogConfig.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bounce animation for typing dots */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0) }
          30% { transform: translateY(-8px) }
        }
      `}</style>
    </div>
  )
}
