const roomUpdates = new Map() // roomId -> Array of updates
const roomUsersCount = new Map() // roomId -> number of connected sockets

// Socket.IO + Yjs collaboration configuration
const handleCollabSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected for real-time collaboration: ${socket.id}`)

    socket.on('join-room', (roomId) => {
      socket.join(roomId)
      socket.roomId = roomId // Store roomId on socket to decrement user count on disconnect
      console.log(`User ${socket.id} joined room: ${roomId}`)

      const count = roomUsersCount.get(roomId) || 0
      const updates = roomUpdates.get(roomId)
      const isFirst = count === 0 && (!updates || updates.length === 0)
      
      roomUsersCount.set(roomId, count + 1)

      // Send existing Yjs history updates to the newly joined client
      socket.emit('room-info', { isFirst })
      if (updates && updates.length > 0) {
        socket.emit('yjs-history', updates)
      }
    })

    socket.on('code-update', (data) => {
      // Legacy basic string broadcast (kept for backward compatibility if needed)
      socket.to(data.roomId).emit('code-update', data.delta)
    })

    socket.on('yjs-update', ({ roomId, update }) => {
      // Store in memory history
      if (!roomUpdates.has(roomId)) {
        roomUpdates.set(roomId, [])
      }
      roomUpdates.get(roomId).push(update)

      // Broadcast Yjs document update to other clients in the room
      socket.to(roomId).emit('yjs-update', update)
    })

    socket.on('yjs-req-state', (data) => {
      // Forward Yjs state vector request to others so they can send missing updates
      socket.to(data.roomId).emit('yjs-req-state', data)
    })

    socket.on('awareness-update', ({ roomId, update }) => {
      // Broadcast awareness (cursor/selection) update to other clients
      socket.to(roomId).emit('awareness-update', update)
    })

    socket.on('chat-message', (data) => {
      // data: { roomId, message: { id, sender, text, timestamp, role } }
      socket.to(data.roomId).emit('chat-message', data.message)
    })

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`)
      if (socket.roomId) {
        const count = roomUsersCount.get(socket.roomId) || 0
        if (count > 1) {
          roomUsersCount.set(socket.roomId, count - 1)
        } else {
          roomUsersCount.delete(socket.roomId)
        }
      }
    })
  })
}

module.exports = handleCollabSockets
