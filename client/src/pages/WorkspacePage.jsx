import { useParams, useNavigate } from 'react-router-dom'
import EditorView from '../components/EditorView'
import PageTransition from '../components/ui/PageTransition'
import { useProjectStore } from '../store/projectStore'

export default function WorkspacePage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const project = useProjectStore((s) => s.getProject(projectId))
  const updateProject = useProjectStore((s) => s.updateProject)

  if (!project) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <p className="text-xl font-bold gradient-text mb-2">Project not found</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <PageTransition>
      <EditorView
        project={project}
        onNavigate={(target) => {
          if (target === 'dashboard') navigate('/')
          else if (target === 'chat') navigate('/chat')
        }}
        onCodeChange={(code) => updateProject(projectId, { code })}
      />
    </PageTransition>
  )
}
