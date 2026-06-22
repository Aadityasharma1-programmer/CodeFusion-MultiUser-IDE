import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import WorkspacePage from './pages/WorkspacePage'
import ChatPage from './pages/ChatPage'
import ContactPage from './pages/ContactPage'
import ProfilePage from './pages/ProfilePage'
import { Loader2 } from 'lucide-react'
import DemoOne from './components/ui/demo'

function PrivateRoute({ children }) {
  const session = useAuthStore((s) => s.session)
  const loading = useAuthStore((s) => s.loading)

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-cyan" />
          <p className="text-sm text-slate-400">Loading your workspace…</p>
        </div>
      </div>
    )
  }

  return session ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const session = useAuthStore((s) => s.session)
  const loading = useAuthStore((s) => s.loading)

  if (loading) return null
  return session ? <Navigate to="/" replace /> : children
}

export default function App() {
  const location = useLocation()

  return (
    <div key={location.pathname} className="min-h-screen">
      <Routes location={location}>
        {/* Public routes */}
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Auth callback for password reset email link */}
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route path="/"                    element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/workspace/:projectId" element={<PrivateRoute><WorkspacePage /></PrivateRoute>} />
        <Route path="/chat"                element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/profile"             element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

        <Route path="/demo" element={<DemoOne />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
