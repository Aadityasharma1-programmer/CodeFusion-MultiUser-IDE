import api from './client'
import { supabase } from '../lib/supabase'

// ── Auth ──────────────────────────────────────────────────────────────────
export async function loginUser(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export async function registerUser(username, email, password) {
  const { data } = await api.post('/auth/register', { username, email, password })
  return data
}

// ── AI Chat ───────────────────────────────────────────────────────────────
/**
 * @param {string} prompt      - user message
 * @param {string} code        - current editor content
 * @param {string} language    - editor language
 * @param {Array}  history     - [{role:'user'|'assistant', content:string}]
 * @param {string} mode        - 'chat' | 'explain' | 'fix' | 'complete'
 */
export async function sendAiChat({ prompt, code, language, history, mode = 'chat' }) {
  const { data } = await api.post('/ai/chat', { prompt, code, language, history, mode })
  return data  // { reply, usage }
}

// Keep the old name for any legacy callers
export async function generateAiReply(prompt) {
  const { data } = await api.post('/ai/chat', { prompt, mode: 'chat' })
  return data.reply
}

// ── Code Execution ────────────────────────────────────────────────────────
export async function executeCode(code, language) {
  const { data } = await api.post('/sandbox/execute', { code, language })
  return data.output
}

// ── File Persistence (Supabase) ───────────────────────────────────────────

/**
 * Upsert a single file's content to Supabase.
 * Uses the stable file ID as the path key so renames don't break saves.
 * @param {string} projectId   - UUID of the project (or string ID for demo projects)
 * @param {string} fileId      - stable file node ID (used as unique path key)
 * @param {string} filePath    - human-readable path (e.g. 'src/main.js')
 * @param {string} content     - file content
 */
export async function upsertFile(projectId, fileId, filePath, content) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Validate UUID format before hitting Supabase
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId || '')
  if (!isUuid) return null

  // Manual upsert: check if it exists first (since your DB might be missing the unique constraint)
  const { data: existing } = await supabase
    .from('files')
    .select('id')
    .eq('project_id', projectId)
    .eq('path', `/cf-file-id/${fileId}`)
    .single()

  let data, error

  if (existing) {
    // Update existing file
    const res = await supabase
      .from('files')
      .update({ content })
      .eq('id', existing.id)
      .select('id')
      .single()
    data = res.data
    error = res.error
  } else {
    // Insert new file
    const res = await supabase
      .from('files')
      .insert({
        project_id: projectId,
        path: `/cf-file-id/${fileId}`,
        content,
      })
      .select('id')
      .single()
    data = res.data
    error = res.error
  }

  if (error) {
    // Only log unexpected errors
    const ignored = ['invalid input syntax', 'schema cache', 'is_folder']
    if (!ignored.some(s => error.message?.includes(s))) {
      console.warn('[AutoSave] upsertFile error:', error.message)
    }
    return null
  }
  return data
}

/**
 * Load all saved file contents for a project from Supabase.
 * Returns a map of { fileId: content } for all files previously saved.
 */
export async function loadProjectFiles(projectId) {
  const { data, error } = await supabase
    .from('files')
    .select('path, content')
    .eq('project_id', projectId)
    .like('path', '/cf-file-id/%')

  if (error || !data) return {}

  // Convert rows back to { fileId: content }
  const result = {}
  for (const row of data) {
    const fileId = row.path.replace('/cf-file-id/', '')
    result[fileId] = row.content ?? ''
  }
  return result
}

/**
 * Creates a project in Supabase (so files have a valid foreign key to attach to).
 */
export async function createDbProject(id, name, lang) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('projects')
    .insert({
      id,
      name,
      owner_id: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('[Supabase] Failed to create project:', error.message)
    return null
  }
  return data
}

/**
 * Delete a project from Supabase.
 */
export async function deleteDbProject(id) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[Supabase] Failed to delete project:', error.message)
    return false
  }
  return true
}

/**
 * Update project name in Supabase.
 */
export async function updateDbProject(id, name) {
  const { error } = await supabase
    .from('projects')
    .update({ name })
    .eq('id', id)

  if (error) {
    console.error('[Supabase] Failed to update project:', error.message)
    return false
  }
  return true
}

/**
 * Add a collaborator to a project using their user ID.
 */
export async function addProjectCollaborator(project, friendId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Validate UUID to prevent foreign key issues with old legacy projects
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.id)
  if (!isUuid) {
    throw new Error('Cannot share this project because it was created before cloud sync was enabled. Please create a new project and copy your code over.')
  }

  // Check if project already exists in the database
  const { data: existingProj } = await supabase
    .from('projects')
    .select('id')
    .eq('id', project.id)
    .maybeSingle()

  if (!existingProj) {
    // If it does not exist, insert it (the current user becomes the owner)
    const { error: insertError } = await supabase.from('projects').insert({
      id: project.id,
      name: project.name,
      owner_id: user.id
    })
    
    if (insertError) {
      throw new Error('Failed to synchronize project: ' + insertError.message)
    }
  }

  // Insert into project_members
  const { data, error } = await supabase
    .from('project_members')
    .insert({
      project_id: project.id,
      user_id: friendId,
      role: 'editor'
    })
    .select()

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('User is already a collaborator')
    }
    throw new Error(error.message)
  }

  return true
}

/**
 * Load all projects shared with the user (where they are a member or owner).
 */
export async function fetchSharedProjects() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get projects where user is the owner
  const { data: ownedProjects, error: ownedError } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user.id)
    
  // Get projects where user is a member
  const { data: memberRows, error: memberError } = await supabase
    .from('project_members')
    .select('project_id, projects(*)')
    .eq('user_id', user.id)

  const projects = []
  
  if (!ownedError && ownedProjects) {
    projects.push(...ownedProjects)
  }
  
  if (!memberError && memberRows) {
    for (const row of memberRows) {
      if (row.projects && !projects.find(p => p.id === row.projects.id)) {
        projects.push(row.projects)
      }
    }
  }

  return projects
}

