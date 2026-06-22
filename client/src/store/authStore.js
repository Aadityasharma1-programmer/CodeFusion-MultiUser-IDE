import { create } from 'zustand'
import { supabase } from '../lib/supabase'

/**
 * Auth store – backed by Supabase Auth.
 *
 * State shape:
 *   user    – Supabase User object (null if logged out)
 *   profile – public.profiles row (username, plan, avatar_url)
 *   session – Supabase Session object (contains access_token)
 *   loading – true while we're bootstrapping from an existing session
 */
export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,   // true until we've checked for an existing session

  // ──────────────────────────────────────────────────────────
  // Bootstrap: call this once on app start (see main.jsx)
  // ──────────────────────────────────────────────────────────
  init: async () => {
    // Restore session from localStorage (Supabase does this automatically)
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const profile = await get()._fetchProfile(session.user.id)
      set({ user: session.user, session, profile, loading: false })
    } else {
      set({ loading: false })
    }

    // Listen for session changes (login, logout, token refresh)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await get()._fetchProfile(session.user.id)
        set({ user: session.user, session, profile })
      } else {
        set({ user: null, session: null, profile: null })
      }
    })
  },

  // ──────────────────────────────────────────────────────────
  // Internal: fetch the public.profiles row for a user
  // ──────────────────────────────────────────────────────────
  _fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, name, avatar_url, member_code, created_at, bio, github_url, portfolio_url, job_title, skills')
      .eq('id', userId)
      .single()
    if (data) {
      return {
        ...data,
        username: data.name
      }
    }
    return null
  },

  // ──────────────────────────────────────────────────────────
  // Register (FR-001)
  // ──────────────────────────────────────────────────────────
  register: async (username, email, password) => {
    // 1. Create the Auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // This gets picked up by the handle_new_user() trigger
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error

    // 2. If email confirmation is disabled in Supabase, the session is
    //    available immediately. Otherwise the user gets a confirmation email.
    return data
  },

  // ──────────────────────────────────────────────────────────
  // Login (FR-002)
  // ──────────────────────────────────────────────────────────
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  },

  // ──────────────────────────────────────────────────────────
  // Forgot password – sends a reset link (FR-003)
  // ──────────────────────────────────────────────────────────
  sendPasswordReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  },

  // ──────────────────────────────────────────────────────────
  // Confirm new password (after clicking the email link)
  // ──────────────────────────────────────────────────────────
  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },

  // ──────────────────────────────────────────────────────────
  // Logout
  // ──────────────────────────────────────────────────────────
  logout: async () => {
    await supabase.auth.signOut()
    // onAuthStateChange above will clear state automatically
  },

  // ──────────────────────────────────────────────────────────
  // Update Profile
  // ──────────────────────────────────────────────────────────
  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')

    // Update public.profiles
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) throw error

    // Also update auth user metadata if name is provided
    if (updates.name) {
      await supabase.auth.updateUser({
        data: { name: updates.name }
      })
    }

    // Refresh profile in state
    const profile = await get()._fetchProfile(user.id)
    set({ profile })
  },

  // ──────────────────────────────────────────────────────────
  // Helpers used by the rest of the app
  // ──────────────────────────────────────────────────────────
  get isAuthenticated() {
    return !!get().session
  },

  // Convenience: display name (username from profile, or email prefix)
  get displayName() {
    const { profile, user } = get()
    return profile?.username ?? user?.email?.split('@')[0] ?? 'User'
  },
}))
