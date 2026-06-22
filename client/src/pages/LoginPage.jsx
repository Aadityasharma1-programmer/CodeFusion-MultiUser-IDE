import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import AuthLayout from '../components/ui/AuthLayout'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const loginFn  = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await loginFn(email, password)
      navigate('/')
    } catch (err) {
      // Supabase returns a message in err.message
      setError(err.message || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout subtitle="Real-time collaborative IDE with AI assistance">
      <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
      <p className="text-sm text-slate-400 mb-6">Sign in to your workspace</p>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2.5 text-sm text-coral animate-fade-in">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="animate-fade-up stagger-3">
          <label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input pl-10"
            />
          </div>
        </div>

        {/* Password */}
        <div className="animate-fade-up stagger-4">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-cyan hover:text-magenta transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input pl-10"
            />
          </div>
        </div>

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-2 flex items-center justify-center gap-2 animate-fade-up stagger-5"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Signing in…</>
          ) : (
            <>Sign in to workspace <ArrowRight size={16} /></>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6 animate-fade-up stagger-6">
        No account yet?{' '}
        <Link to="/register" className="font-semibold text-cyan hover:text-magenta transition-colors">
          Create one free
        </Link>
      </p>
    </AuthLayout>
  )
}
