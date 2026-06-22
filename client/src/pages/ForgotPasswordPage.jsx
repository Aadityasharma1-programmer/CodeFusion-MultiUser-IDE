import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import AuthLayout from '../components/ui/AuthLayout'
import { useAuthStore } from '../store/authStore'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)

  const sendPasswordReset = useAuthStore((s) => s.sendPasswordReset)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await sendPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout subtitle="Password reset">
        <div className="flex flex-col items-center text-center gap-4 py-4 animate-scale-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan/10 border border-cyan/30 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
            <CheckCircle2 size={32} className="text-cyan" />
          </div>
          <h2 className="text-xl font-bold text-white">Reset link sent!</h2>
          <p className="text-sm text-slate-400 max-w-xs">
            Check your inbox at <span className="text-cyan font-medium">{email}</span>.
            The link will expire in 1 hour.
          </p>
          <Link to="/login" className="btn-ghost flex items-center gap-2 mt-2">
            <ArrowLeft size={15} /> Back to Sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout subtitle="Reset your password">
      <h2 className="text-xl font-bold text-white mb-1">Forgot password?</h2>
      <p className="text-sm text-slate-400 mb-6">
        Enter your email and we'll send you a reset link.
      </p>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2.5 text-sm text-coral animate-fade-in">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form id="forgot-password-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="animate-fade-up stagger-3">
          <label htmlFor="forgot-email" className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              id="forgot-email"
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

        <button
          id="forgot-submit"
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-2 flex items-center justify-center gap-2 animate-fade-up stagger-4"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Sending link…</>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6 animate-fade-up stagger-5">
        <Link to="/login" className="flex items-center justify-center gap-1.5 text-slate-400 hover:text-cyan transition-colors">
          <ArrowLeft size={14} /> Back to Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
