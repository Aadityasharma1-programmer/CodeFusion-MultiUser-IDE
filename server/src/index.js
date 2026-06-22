const express = require('express')
const http = require('http')
const cors = require('cors')
const socketIo = require('socket.io')

require('dotenv').config()

// Routes
const aiRoutes      = require('./routes/ai')
const sandboxRoutes = require('./routes/sandbox')

const app    = express()
const server = http.createServer(app)
const io     = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
  }
})

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}))
app.use(express.json())

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// ── API Routes ────────────────────────────────────────────────
app.use('/api/ai',      aiRoutes)
app.use('/api/sandbox', sandboxRoutes)

// ── Socket.IO collaboration ───────────────────────────────────
const handleCollabSockets = require('./sockets/collab')
handleCollabSockets(io)
 

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`✅  Codefusion server running on http://localhost:${PORT}`)
})
