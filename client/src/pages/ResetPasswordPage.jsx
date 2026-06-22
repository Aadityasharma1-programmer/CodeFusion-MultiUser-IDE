import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import AuthLayout from '../components/ui/AuthLayout'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

/**
 * This page is rendered when the user clicks the password-reset
 * link from their email. Supabase redirects to:
 *   /auth/reset-password#access_token=…&type=recovery
 *
 * The Supabase client picks up the token from the URL hash automatically
 * via detectSessionInUrl=true, so by the time this component mounts
 * the user already has a temporary session we can use to call updateUser.
 */
export default function ResetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [validLink, setValidLink] = useState(false)

  const updatePassword = useAuthStore((s) => s.updatePassword)
  const navigate       = useNavigate()

  // Verify that we have a recovery session before letting the user type
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidLink(!!session)
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await updatePassword(password)
      setDone(true)
      // Redirect to dashboard after 2 s
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setError(err.message || 'Failed to update password. Please request a new link.')
    } finally {
      setLoading(false)
    }
  }

  if (!validLink) {
    return (
      <AuthLayout subtitle="Password reset">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral/10 border border-coral/30">
            <AlertCircle size={32} className="text-coral" />
          </div>
          <h2 className="text-xl font-bold text-white">Invalid or expired link</h2>
          <p className="text-sm text-slate-400 max-w-xs">
            This reset link is no longer valid. Please request a new one.
          </p>
          <button onClick={() => navigate('/forgot-password')} className="btn-primary mt-2 px-6">
            Request new link
          </button>
        </div>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout subtitle="Password reset">
        <div className="flex flex-col items-center text-center gap-4 py-4 animate-scale-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lime/10 border border-lime/30">
            <CheckCircle2 size={32} className="text-lime" />
          </div>
          <h2 className="text-xl font-bold text-white">Password updated!</h2>
          <p className="text-sm text-slate-400">Redirecting you to your workspace…</p>
          <Loader2 size={20} className="animate-spin text-cyan" />
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout subtitle="Choose a new password">
      <h2 className="text-xl font-bold text-white mb-1">Reset password</h2>
      <p className="text-sm text-slate-400 mb-6">Enter a new password for your account.</p>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-coral/40 bg-coral/10 px-3 py-2.5 text-sm text-coral animate-fade-in">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form id="reset-password-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="animate-fade-up stagger-3">
          <label htmlFor="reset-password" className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              id="reset-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="input pl-10"
            />
          </div>
        </div>

        <div className="animate-fade-up stagger-4">
          <label htmlFor="reset-confirm" className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              id="reset-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              className="input pl-10"
            />
          </div>
        </div>

        <button
          id="reset-submit"
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-2 flex items-center justify-center gap-2 animate-fade-up stagger-5"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Updating password…</>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
