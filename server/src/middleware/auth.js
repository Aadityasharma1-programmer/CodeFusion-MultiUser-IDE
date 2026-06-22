const { createClient } = require('@supabase/supabase-js')

/**
 * Auth middleware – verifies the Supabase JWT from the Authorization header.
 * Attaches req.user (the Supabase User object) on success.
 *
 * Clients send:  Authorization: Bearer <supabase_access_token>
 */
const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Access denied: no token provided' })
  }

  try {
    // Create a per-request anon client and inject the user's JWT.
    // getUser() validates the token against Supabase Auth and returns the user.
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid or expired token' })
    }

    req.user = user   // { id, email, ... }
    next()
  } catch (error) {
    res.status(500).json({ message: 'Auth verification failed', error: error.message })
  }
}

module.exports = authMiddleware
