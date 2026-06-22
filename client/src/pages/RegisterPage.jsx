import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import AuthLayout from '../components/ui/AuthLayout'
import { useAuthStore } from '../store/authStore'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const registerFn = useAuthStore((s) => s.register)
  const navigate   = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (form.username.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }

    setLoading(true)
    try {
      const data = await registerFn(form.username, form.email, form.password)

      // Supabase may require email confirmation before a session is created.
      // If a session exists immediately, redirect to dashboard.
      // Otherwise show a "check your email" message.
      if (data.session) {
        navigate('/')
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout subtitle="Almost there!">
        <div className="flex flex-col items-center text-center gap-4 py-4 animate-scale-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lime/10 border border-lime/30">
            <CheckCircle2 size={32} className="text-lime" />
          </div>
          <h2 className="text-xl font-bold text-white">Check your inbox</h2>
          <p className="text-sm text-slate-400 max-w-xs">
            We sent a confirmation link to <span className="text-cyan font-medium">{form.email}</span>.
            Click it to activate your account and start coding!
          </p>
          <Link to="/login" className="btn-primary mt-2 px-8">
            Back to Sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout subtitle="Start collaborating in minutes">
      <h2 className="text-xl font-bold text-white mb-1">Create account</h2>
      <p className="text-sm text-slate-400 mb-6">Join the Codefusion workspace</p>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2.5 text-sm text-coral animate-fade-in">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form id="register-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div className="animate-fade-up stagger-3">
          <label htmlFor="reg-username" className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Username
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              id="reg-username"
              className="input pl-10"
              type="text"
              placeholder="cooldev42"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              minLength={3}
              autoComplete="username"
            />
          </div>
        </div>

        {/* Email */}
        <div className="animate-fade-up stagger-4">
          <label htmlFor="reg-email" className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              id="reg-email"
              className="input pl-10"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div className="animate-fade-up stagger-5">
          <label htmlFor="reg-password" className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              id="reg-password"
              className="input pl-10"
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* Confirm password */}
        <div className="animate-fade-up stagger-6">
          <label htmlFor="reg-confirm" className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              id="reg-confirm"
              className="input pl-10"
              type="password"
              placeholder="Re-enter your password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        <button
          id="register-submit"
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Creating account…</>
          ) : (
            <>Create account <ArrowRight size={16} /></>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-cyan hover:text-magenta transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
