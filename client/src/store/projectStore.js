import { create } from 'zustand'
import { createDbProject, deleteDbProject, updateDbProject, fetchSharedProjects, addProjectCollaborator } from '../api/auth'

const DEFAULT_PROJECTS = []

function loadProjects() {
  try {
    const saved = localStorage.getItem('cf_projects')
    if (saved) {
      const parsed = JSON.parse(saved)
      return parsed.filter((p) => 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id) &&
        !(p.name && p.name.startsWith('DM:'))
      )
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PROJECTS
}

function persist(projects) {
  localStorage.setItem('cf_projects', JSON.stringify(projects))
}

export const useProjectStore = create((set, get) => ({
  projects: loadProjects(),
  loading: false,

  initProjects: async () => {
    set({ loading: true })
    try {
      const shared = await fetchSharedProjects()
      if (shared && shared.length > 0) {
        const locals = get().projects
        // Merge without duplicates
        const merged = [...locals]
        for (const p of shared) {
          if (p.description === 'DM_CHAT' || p.description === 'GROUP_CHAT' || (p.name && p.name.startsWith('DM:'))) {
            continue
          }
          if (!merged.find(m => m.id === p.id)) {
            // Map DB project to local schema if needed
            merged.push({
              id: p.id,
              name: p.name,
              lang: p.lang || 'javascript', // Assume JS if not set
              updated: new Date(p.created_at || Date.now()).toLocaleDateString(),
              team: [],
              code: p.code || '',
              owner_id: p.owner_id
            })
          }
        }
        set({ projects: merged })
        persist(merged)
      }
    } catch (e) {
      console.error('Failed to init projects:', e)
    } finally {
      set({ loading: false })
    }
  },

  addCollaborator: async (project, friendId) => {
    try {
      await addProjectCollaborator(project, friendId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  getProject: (id) => get().projects.find((p) => p.id === id),

  addProject: (name, lang = 'javascript') => {
    // Generate a valid UUID so it works with Supabase
    const id = crypto.randomUUID()
    const project = {
      id,
      name,
      lang,
      updated: 'Just now',
      team: [],
      code: getDefaultCode(lang),
    }
    const projects = [project, ...get().projects]
    persist(projects)
    set({ projects })
    
    // Register it in Supabase so files can be saved with this project_id
    createDbProject(id, name, lang).catch(console.error)

    return project
  },

  updateProject: (id, updates) => {
    const projects = get().projects.map((p) =>
      p.id === id ? { ...p, ...updates, updated: 'Just now' } : p
    )
    persist(projects)
    set({ projects })

    if (updates.name) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      if (isUuid) {
        updateDbProject(id, updates.name).catch(console.error)
      }
    }
  },

  deleteProject: (id) => {
    const projects = get().projects.filter((p) => p.id !== id)
    persist(projects)
    set({ projects })

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    if (isUuid) {
      deleteDbProject(id).catch(console.error)
    }
  },
}))

export function getExtensionForLang(lang) {
  const exts = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    go: 'go',
    c: 'c',
    cpp: 'cpp',
    java: 'java',
    rust: 'rs',
    ruby: 'rb',
    php: 'php',
    csharp: 'cs',
    swift: 'swift'
  }
  return exts[lang] || 'js'
}

function getDefaultCode(lang) {
  const templates = {
    javascript: `// New JavaScript project\nconsole.log("Hello from Codefusion!");`,
    python: `# New Python project\nprint("Hello from Codefusion!")`,
    go: `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello from Codefusion!")\n}`,
    typescript: `// New TypeScript project\nconst greet = (name: string) => \`Hello, \${name}!\`;\nconsole.log(greet("Codefusion"));`,
    c: `#include <stdio.h>\n\nint main() {\n    printf("Hello from Codefusion!\\n");\n    return 0;\n}`,
    cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello from Codefusion!" << std::endl;\n    return 0;\n}`,
    java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Codefusion!");\n    }\n}`,
    rust: `fn main() {\n    println!("Hello from Codefusion!");\n}`,
    ruby: `# New Ruby project\nputs "Hello from Codefusion!"`,
    php: `<?php\n// New PHP project\necho "Hello from Codefusion!\\n";\n?>`,
    csharp: `using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello from Codefusion!");\n    }\n}`,
    swift: `// New Swift project\nprint("Hello from Codefusion!")`
  }
  return templates[lang] || templates.javascript
}

export const LANG_LABELS = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  go: 'Go',
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  rust: 'Rust',
  ruby: 'Ruby',
  php: 'PHP',
  csharp: 'C#',
  swift: 'Swift',
}

export const LANG_COLORS = {
  javascript: 'text-amber bg-amber/10 border-amber/30',
  typescript: 'text-cyan bg-cyan/10 border-cyan/30',
  python: 'text-violet bg-violet/10 border-violet/30',
  go: 'text-coral bg-coral/10 border-coral/30',
  c: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  cpp: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30',
  java: 'text-red-400 bg-red-400/10 border-red-400/30',
  rust: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  ruby: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  php: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  csharp: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  swift: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
}
