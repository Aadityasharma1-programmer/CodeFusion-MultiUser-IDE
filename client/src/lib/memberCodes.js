import { supabase } from './supabase'

// ── Member Code Registry ──────────────────────────────────────────────────
// Each registered user gets a unique 8-char alphanumeric code based on their
// Supabase user ID. The codes are stored in a `member_codes` Supabase table
// with localStorage fallback if the table doesn't exist yet.
//
// Table schema (run in Supabase SQL editor):
//   CREATE TABLE public.member_codes (
//     code        text primary key,
//     user_id     uuid references auth.users(id) on delete cascade,
//     username    text not null,
//     avatar_url  text,
//     status      text default 'online',
//     created_at  timestamptz default now()
//   );
//   ALTER TABLE public.member_codes ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "member_codes_public_read" ON public.member_codes FOR SELECT USING (true);
//   CREATE POLICY "member_codes_own_write" ON public.member_codes FOR ALL USING ((select auth.uid()) = user_id);

const LS_KEY = 'cf_member_codes_registry'

/**
 * Generate a deterministic 8-char uppercase code from a UUID string.
 * e.g. "CF-A4B2C3D1"
 */
export function generateCode(userId) {
  if (!userId) return 'CF-UNKNOWN'
  // Take first 8 hex chars of the UUID (after removing dashes) and uppercase them
  const clean = userId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `CF-${clean}`
}

const MOCK_MEMBERS = {
  'CF-ALEX': { code: 'CF-ALEX', userId: 'mock-alex-uuid', username: 'Alex Rivera', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfJxnsCxtU6ULQUEAX9nQq3ZGNQDCZFwjlI3ZvnT03xYW4IPd_fJwVP1gUO48kt6felyS16a0Nr_bI8SHd1iUdtji8iY2bCyiuwYLxFpzzd2fXPsojBBf1kjSMxNwh0kQhx6o66H4CmuYv43vY9ZNnqlZxa4ic5sA-_23dnqv4YVQjRT6ymvUaa30DmdIL9zuoME03QajQ34d7uY8XVPMmwGFi3sIROmkIAQ6yFRlqh0d_w8_NOttBW7XoNAsre37Ulz-6ulTEwk85', status: 'online' },
  'CF-SARAH': { code: 'CF-SARAH', userId: 'mock-sarah-uuid', username: 'Sarah Chen', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAJVfHKMHN3IcgFS6HUTi3zkwiI-hm8YgsPvogzwtNlAOc1LjKUGcsZ7GW1MJtoABHkjUz092DMMZoalUoAxYOpEuT2lL52bipACKPfFOKcn5i9_KzCKZyP7qkqhuw5W0JicCQg8fDcF4eycKble92NBL4uZXS9mCcjAumZ8eYVGl-XIEKq2-VSeRZX3SgBNqPfeN2ZTLKI4AlUR7a4B7bAKvzCLk8pWTcggLcdtSuQYIKaxeyc1ib-VMwfPw-wOLHq2ssgjK0AG1h', status: 'online' },
  'CF-MARKUS': { code: 'CF-MARKUS', userId: 'mock-markus-uuid', username: 'Markus Vogt', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7To5hAeNS-A1egGp3L6U-WgMr9roXX386lYokzRzCxkEz3QVUQ3ve-k5LNtjxswuTEvzUMQNBxJJVL1hvDamDcpMjFwjIA5bG5MVULM40O6wDHDx8nfAUL45VTTTEUK9IyFE_pWINVVT3_cZMqndKcDg3XkCeufE1-ajRbMQ1gCaxLbbk3cRxKldRVXUZzAU48t_pnwFUYPiSP2gFEmUSaHFzrZMmgeI1m_JL5t4HGxWUKZSa1-lwg4D9yXoxbENtldmLjiOYfKIH', status: 'offline' }
}

/** Load the local registry from localStorage */
function loadLocal() {
  try {
    const saved = localStorage.getItem(LS_KEY)
    const registry = saved ? JSON.parse(saved) : {}
    return { ...MOCK_MEMBERS, ...registry }
  } catch {
    return MOCK_MEMBERS
  }
}

/** Persist to localStorage */
function saveLocal(registry) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(registry))
  } catch { /* quota */ }
}

/**
 * Register the current user's code in both Supabase profiles and localStorage.
 * Call this once on app load after auth is ready.
 */
export async function registerCurrentUser(userId, username, avatarUrl = null) {
  if (!userId || !username) return null
  const code = generateCode(userId)

  // Always persist locally first (instant fallback)
  const local = loadLocal()
  local[code] = { code, userId, username, avatarUrl, status: 'online' }
  saveLocal(local)

  // Attempt Supabase sync directly on the profiles table
  try {
    await supabase
      .from('profiles')
      .update({
        member_code: code,
        avatar_url: avatarUrl,
      })
      .eq('id', userId)
  } catch (err) {
    console.error('Error registering member code in profiles:', err)
  }

  return code
}

/**
 * Look up a member by their code.
 * Returns { code, userId, username, avatarUrl, status } or null if not found.
 */
export async function lookupMemberCode(code) {
  let normalized = code.trim().toUpperCase()
  if (normalized && !normalized.startsWith('CF-')) {
    normalized = `CF-${normalized}`
  }

  // 1. Try Supabase profiles table directly
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, member_code')
      .eq('member_code', normalized)
      .single()

    if (!error && data) {
      return {
        code: data.member_code,
        userId: data.id,
        username: data.name, // Profiles uses name column for display name
        avatarUrl: data.avatar_url,
        status: 'online',
      }
    }
  } catch (err) {
    console.error('Error looking up member code in profiles:', err)
  }

  // 2. Fallback to localStorage
  const local = loadLocal()
  if (local[normalized]) {
    const entry = local[normalized]
    return {
      code: entry.code,
      userId: entry.userId,
      username: entry.username,
      avatarUrl: entry.avatarUrl || null,
      status: entry.status || 'online',
    }
  }

  return null // Not found
}

/**
 * Get all registered members (for browsing friends).
 */
export async function getAllMembers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, member_code')
      .not('member_code', 'is', null)
      .limit(50)

    if (!error && data?.length > 0) {
      return data.map(d => ({
        code: d.member_code || generateCode(d.id),
        username: d.name,
        avatarUrl: d.avatar_url,
        status: 'online',
      }))
    }
  } catch (err) {
    console.error('Error getting all profiles:', err)
  }

  // Fallback: return everything in localStorage
  const local = loadLocal()
  return Object.values(local).map(e => ({
    code: e.code,
    username: e.username,
    avatarUrl: e.avatarUrl || null,
    status: e.status || 'online',
  }))
}

/** Persist friends list to localStorage */
export function saveFriends(friends) {
  try {
    localStorage.setItem('cf_friends', JSON.stringify(friends))
  } catch { /* quota */ }
}

/** Load friends list from localStorage */
export function loadFriends() {
  try {
    const saved = localStorage.getItem('cf_friends')
    if (saved) return JSON.parse(saved)
    const defaults = [
      { code: 'CF-ALEX', username: 'Alex Rivera', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfJxnsCxtU6ULQUEAX9nQq3ZGNQDCZFwjlI3ZvnT03xYW4IPd_fJwVP1gUO48kt6felyS16a0Nr_bI8SHd1iUdtji8iY2bCyiuwYLxFpzzd2fXPsojBBf1kjSMxNwh0kQhx6o66H4CmuYv43vY9ZNnqlZxa4ic5sA-_23dnqv4YVQjRT6ymvUaa30DmdIL9zuoME03QajQ34d7uY8XVPMmwGFi3sIROmkIAQ6yFRlqh0d_w8_NOttBW7XoNAsre37Ulz-6ulTEwk85', status: 'online' },
      { code: 'CF-SARAH', username: 'Sarah Chen', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAJVfHKMHN3IcgFS6HUTi3zkwiI-hm8YgsPvogzwtNlAOc1LjKUGcsZ7GW1MJtoABHkjUz092DMMZoalUoAxYOpEuT2lL52bipACKPfFOKcn5i9_KzCKZyP7qkqhuw5W0JicCQg8fDcF4eycKble92NBL4uZXS9mCcjAumZ8eYVGl-XIEKq2-VSeRZX3SgBNqPfeN2ZTLKI4AlUR7a4B7bAKvzCLk8pWTcggLcdtSuQYIKaxeyc1ib-VMwfPw-wOLHq2ssgjK0AG1h', status: 'online' },
      { code: 'CF-MARKUS', username: 'Markus Vogt', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7To5hAeNS-A1egGp3L6U-WgMr9roXX386lYokzRzCxkEz3QVUQ3ve-k5LNtjxswuTEvzUMQNBxJJVL1hvDamDcpMjFwjIA5bG5MVULM40O6wDHDx8nfAUL45VTTTEUK9IyFE_pWINVVT3_cZMqndKcDg3XkCeufE1-ajRbMQ1gCaxLbbk3cRxKldRVXUZzAU48t_pnwFUYPiSP2gFEmUSaHFzrZMmgeI1m_JL5t4HGxWUKZSa1-lwg4D9yXoxbENtldmLjiOYfKIH', status: 'offline' }
    ]
    localStorage.setItem('cf_friends', JSON.stringify(defaults))
    return defaults
  } catch {
    return []
  }
}
