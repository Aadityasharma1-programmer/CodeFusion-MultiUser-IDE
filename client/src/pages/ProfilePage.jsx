import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

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

const C = {
  bg:              '#0D0D0D',
  surface:         '#131313',
  surfaceContLow:  '#1c1b1b',
  surfaceCont:     '#201f1f',
  surfaceContHigh: '#2a2a2a',
  onSurface:       '#e5e2e1',
  onSurfaceVar:    '#bdc8d1',
  primary:         '#8ed5ff',
  onPrimary:       '#00354a',
  cyberPink:       '#F43F5E',
  matrixGreen:     '#10B981',
  glassBorder:     'rgba(255,255,255,0.08)',
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, updateProfile, loading } = useAuthStore()
  
  const [username, setUsername] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [skills, setSkills] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [bio, setBio] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (profile) {
      setUsername(profile.name || '')
      setJobTitle(profile.job_title || '')
      setSkills(profile.skills || '')
      setGithubUrl(profile.github_url || '')
      setPortfolioUrl(profile.portfolio_url || '')
      setBio(profile.bio || '')
    } else if (user?.email) {
      setUsername(user.email.split('@')[0])
    }
  }, [profile, user])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await updateProfile({ 
        name: username.trim(),
        job_title: jobTitle.trim(),
        skills: skills.trim(),
        github_url: githubUrl.trim(),
        portfolio_url: portfolioUrl.trim(),
        bio: bio.trim()
      })
      setMessage('Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.onSurface, display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header style={{ height: 60, borderBottom: `1px solid ${C.glassBorder}`, background: C.surface, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'transparent', border: 'none', color: C.onSurfaceVar, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Icon name="arrow_back" size={20} />
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: C.onSurface }}>Profile Settings</h1>
      </header>

      {/* Content */}
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 480, background: C.surfaceContLow, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.primary, color: C.onPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 }}>
              {(username || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.onSurface }}>Your Profile</h2>
              <p style={{ margin: 0, fontSize: 13, color: C.onSurfaceVar, marginTop: 4 }}>{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: C.onSurfaceVar }}>
                Preferred Username
              </label>
              <input 
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 8,
                  backgroundColor: C.surfaceContHigh, border: 'none', color: '#fff',
                  fontSize: '1rem', outline: 'none', transition: 'box-shadow 0.2s'
                }}
                onFocus={e => e.target.style.boxShadow = `0 0 0 2px ${C.primary}40`}
                onBlur={e => e.target.style.boxShadow = 'none'}
              />
              <p style={{ marginTop: 8, fontSize: '0.8rem', color: C.primary, opacity: 0.8 }}>
                This is the name other collaborators will see in the chat and on projects.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: C.onSurfaceVar }}>
                  Job Title / Role
                </label>
                <input 
                  type="text"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Frontend Developer"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 8,
                    backgroundColor: C.surfaceContHigh, border: 'none', color: '#fff',
                    fontSize: '1rem', outline: 'none', transition: 'box-shadow 0.2s'
                  }}
                  onFocus={e => e.target.style.boxShadow = `0 0 0 2px ${C.primary}40`}
                  onBlur={e => e.target.style.boxShadow = 'none'}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: C.onSurfaceVar }}>
                  Skills / Tech Stack
                </label>
                <input 
                  type="text"
                  value={skills}
                  onChange={e => setSkills(e.target.value)}
                  placeholder="e.g. React, Node.js, Python"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 8,
                    backgroundColor: C.surfaceContHigh, border: 'none', color: '#fff',
                    fontSize: '1rem', outline: 'none', transition: 'box-shadow 0.2s'
                  }}
                  onFocus={e => e.target.style.boxShadow = `0 0 0 2px ${C.primary}40`}
                  onBlur={e => e.target.style.boxShadow = 'none'}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem', color: C.onSurfaceVar }}>
                  <Icon name="code" size={18} /> GitHub URL
                </label>
                <input 
                  type="url"
                  value={githubUrl}
                  onChange={e => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/yourusername"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 8,
                    backgroundColor: C.surfaceContHigh, border: 'none', color: '#fff',
                    fontSize: '1rem', outline: 'none', transition: 'box-shadow 0.2s'
                  }}
                  onFocus={e => e.target.style.boxShadow = `0 0 0 2px ${C.primary}40`}
                  onBlur={e => e.target.style.boxShadow = 'none'}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem', color: C.onSurfaceVar }}>
                  <Icon name="language" size={18} /> Portfolio URL
                </label>
                <input 
                  type="url"
                  value={portfolioUrl}
                  onChange={e => setPortfolioUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 8,
                    backgroundColor: C.surfaceContHigh, border: 'none', color: '#fff',
                    fontSize: '1rem', outline: 'none', transition: 'box-shadow 0.2s'
                  }}
                  onFocus={e => e.target.style.boxShadow = `0 0 0 2px ${C.primary}40`}
                  onBlur={e => e.target.style.boxShadow = 'none'}
                />
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: C.onSurfaceVar }}>
                Bio / About Me
              </label>
              <textarea 
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell the community a little bit about yourself..."
                rows={4}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 8,
                  backgroundColor: C.surfaceContHigh, border: 'none', color: '#fff',
                  fontSize: '1rem', outline: 'none', transition: 'box-shadow 0.2s',
                  resize: 'vertical', fontFamily: 'inherit'
                }}
                onFocus={e => e.target.style.boxShadow = `0 0 0 2px ${C.primary}40`}
                onBlur={e => e.target.style.boxShadow = 'none'}
              />
            </div>

            {message && (
              <div style={{ 
                padding: '10px 14px', 
                borderRadius: 6, 
                fontSize: 13, 
                background: message.startsWith('Error') ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
                color: message.startsWith('Error') ? C.cyberPink : C.matrixGreen,
                border: `1px solid ${message.startsWith('Error') ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)'}`
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              style={{
                marginTop: 8,
                background: C.primary,
                color: C.onPrimary,
                border: 'none',
                padding: '12px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                transition: 'opacity 0.2s',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
