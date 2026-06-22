import { useNavigate } from 'react-router-dom'
import Dashboard from '../components/Dashboard'
import PageTransition from '../components/ui/PageTransition'
import { useAuthStore } from '../store/authStore'
import { useProjectStore } from '../store/projectStore'

export default function DashboardPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const projects = useProjectStore((s) => s.projects)
  const addProject = useProjectStore((s) => s.addProject)

  const handleOpenProject = (id) => navigate(`/workspace/${id}`)

  const handleNewProject = (name, lang) => {
    const project = addProject(name, lang)
    navigate(`/workspace/${project.id}`)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <PageTransition>
      <Dashboard
        projects={projects}
        userName={profile?.username || user?.email?.split('@')[0] || 'Developer'}
        onOpenProject={handleOpenProject}
        onNewProject={handleNewProject}
        onLogout={handleLogout}
      />
    </PageTransition>
  )
}
