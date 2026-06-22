import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { lookupMemberCode } from '../lib/memberCodes'
import { playPopSound } from '../lib/utils'

export const useChatStore = create((set, get) => ({
  contacts: [],
  activeContactId: null,
  messages: {}, // { [conversationId]: [messages] }
  mutedMap: {}, // { [conversationId]: boolean }
  onlineUsers: [], // Array of online user IDs
  typingUsers: {}, // { [conversationId]: { [userId]: true } }
  loading: false,
  realtimeChannel: null,
  presenceChannel: null,

  init: async (currentUserId) => {
    if (!currentUserId) return
    set({ loading: true })

    // Helper to dynamically load and prepend a chat room (DM or Group) to contacts sidebar
    const fetchAndAddRoom = async (roomId) => {
      const { data: proj, error } = await supabase
        .from('projects')
        .select('id, name, description, owner_id')
        .eq('id', roomId)
        .single()

      if (error || !proj) {
        console.error('[ChatStore] Error fetching project for room:', error?.message)
        return null
      }

      if (proj.description !== 'DM_CHAT' && proj.description !== 'GROUP_CHAT') {
        return null
      }

      const isGroup = proj.description === 'GROUP_CHAT'
      let name = proj.name
      let avatar = null
      let otherUser = null

      if (!isGroup) {
        // DM format is: DM:user1_id:user2_id
        const parts = proj.name.split(':')
        const otherUserId = parts[1] === currentUserId ? parts[2] : parts[1]
        
        if (otherUserId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', otherUserId)
            .single()

          if (profile) {
            name = profile.name
            avatar = profile.avatar_url
            otherUser = { id: otherUserId, username: profile.name, avatarUrl: profile.avatar_url }
          } else {
            name = `User ${otherUserId.slice(0, 4)}`
          }
        }
      }

      const newContact = {
        id: proj.id,
        name,
        avatar,
        role: isGroup ? 'Group' : 'Collaborator',
        isGroup,
        otherUser,
        ownerId: proj.owner_id,
        online: !isGroup, // mock online status for DMs
        messages: []
      }

      set((state) => {
        if (state.contacts.some(c => c.id === roomId)) return state
        return {
          contacts: [newContact, ...state.contacts]
        }
      })

      return newContact
    }

    // Unsubscribe from any existing channel
    const oldChannel = get().realtimeChannel
    if (oldChannel) {
      oldChannel.unsubscribe()
    }
    const oldPresence = get().presenceChannel
    if (oldPresence) {
      oldPresence.unsubscribe()
    }

    // Setup Presence
    const presenceChannel = supabase.channel('global:presence')
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const onlineIds = []
        for (const id in state) {
          if (state[id].length > 0) {
             onlineIds.push(state[id][0].userId)
          }
        }
        set({ onlineUsers: onlineIds })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ userId: currentUserId, onlineAt: new Date().toISOString() })
        }
      })
    set({ presenceChannel })

    // 1. Fetch conversations (projects with DM_CHAT or GROUP_CHAT description)
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, description, owner_id')
      .in('description', ['DM_CHAT', 'GROUP_CHAT'])

    if (error) {
      console.error('[ChatStore] Error loading conversations:', error.message)
      set({ loading: false })
      return
    }

    const conversations = []

    for (const proj of projects) {
      const isGroup = proj.description === 'GROUP_CHAT'
      let name = proj.name
      let avatar = null
      let otherUser = null

      if (!isGroup) {
        const parts = proj.name.split(':')
        const otherUserId = parts[1] === currentUserId ? parts[2] : parts[1]
        
        if (otherUserId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', otherUserId)
            .single()

          if (profile) {
            name = profile.name
            avatar = profile.avatar_url
            otherUser = { id: otherUserId, username: profile.name, avatarUrl: profile.avatar_url }
          } else {
            name = `User ${otherUserId.slice(0, 4)}`
          }
        }
      }

      // Fetch the last message in this room
      const { data: lastMsgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('project_id', proj.id)
        .order('created_at', { ascending: false })
        .limit(20) // fetch a few so we can find the real last one after filtering

      const clearedAtStr = localStorage.getItem(`cleared_${proj.id}`)
      const clearedAt = clearedAtStr ? new Date(clearedAtStr).getTime() : 0
      
      const validMsgs = (lastMsgs || []).filter(m => new Date(m.created_at).getTime() > clearedAt)
      const lastMsg = validMsgs.length > 0 ? validMsgs[0] : null

      conversations.push({
        id: proj.id,
        name,
        avatar,
        role: isGroup ? 'Group' : 'Collaborator',
        isGroup,
        otherUser,
        ownerId: proj.owner_id,
        online: !isGroup,
        messages: lastMsg ? [{
          id: lastMsg.id,
          from: lastMsg.user_id === currentUserId ? 'me' : lastMsg.user_id,
          text: lastMsg.message || lastMsg.content,
          ts: lastMsg.created_at,
          status: lastMsg.status || 'sent'
        }] : []
      })
    }

    set({ contacts: conversations, loading: false })

    // 2. Subscribe to Realtime insertions on chat_messages AND project_members
    const channel = supabase
      .channel('chat-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMsg = payload.new
          const roomId = newMsg.project_id

          // Check if we have this contact in state. If not, fetch and add it dynamically.
          let contact = get().contacts.find(c => c.id === roomId)
          if (!contact) {
            contact = await fetchAndAddRoom(roomId)
            if (!contact) return
          }

          // Fetch sender's profile for the incoming message
          let senderName = 'Someone'
          let senderAvatar = null

          const { data: profile } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', newMsg.user_id)
            .single()

          if (profile) {
            senderName = profile.name
            senderAvatar = profile.avatar_url
          }

          const formatted = {
            id: newMsg.id,
            from: newMsg.user_id === currentUserId ? 'me' : newMsg.user_id,
            senderName,
            senderAvatar,
            text: newMsg.message || newMsg.content,
            ts: newMsg.created_at,
            status: newMsg.status || 'sent'
          }

          if (formatted.from !== 'me') {
            const isMuted = get().mutedMap[roomId]
            if (!isMuted) {
              playPopSound()
            }
          }

          // Append to messages map in state
          set((state) => {
            const currentMsgs = state.messages[roomId] || []
            if (currentMsgs.some(m => m.id === formatted.id)) return state

            const updatedMsgs = [...currentMsgs, formatted]
            
            const updatedContacts = state.contacts.map(c => {
              if (c.id === roomId) {
                return { ...c, messages: [formatted] }
              }
              return c
            })

            return {
              messages: {
                ...state.messages,
                [roomId]: updatedMsgs
              },
              contacts: updatedContacts
            }
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_members',
          filter: `user_id=eq.${currentUserId}`
        },
        async (payload) => {
          const newMember = payload.new
          const roomId = newMember.project_id
          if (!get().contacts.some(c => c.id === roomId)) {
            await fetchAndAddRoom(roomId)
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { conversationId, userId } = payload.payload
        set((state) => {
          const currentTyping = state.typingUsers[conversationId] || {}
          return {
            typingUsers: {
              ...state.typingUsers,
              [conversationId]: { ...currentTyping, [userId]: true }
            }
          }
        })
        
        // Auto-clear typing indicator after 3 seconds
        setTimeout(() => {
          set((state) => {
            const currentTyping = state.typingUsers[conversationId] || {}
            const newTyping = { ...currentTyping }
            delete newTyping[userId]
            return {
              typingUsers: {
                ...state.typingUsers,
                [conversationId]: newTyping
              }
            }
          })
        }, 3000)
      })
      .subscribe()

    set({ realtimeChannel: channel })
  },

  setActiveContact: (contactId) => {
    set({ activeContactId: contactId })
    if (contactId) {
      get().fetchMessages(contactId)
    }
  },

  fetchMessages: async (conversationId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[ChatStore] Error loading messages:', error.message)
      return
    }

    const clearedAtStr = localStorage.getItem(`cleared_${conversationId}`)
    const clearedAt = clearedAtStr ? new Date(clearedAtStr).getTime() : 0

    const validData = data.filter(m => new Date(m.created_at).getTime() > clearedAt)

    const userIds = [...new Set(validData.map(m => m.user_id))]
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', userIds)
      
    const profilesMap = (profilesData || []).reduce((acc, p) => {
      acc[p.id] = p
      return acc
    }, {})

    const formatted = validData.map(m => {
      const p = profilesMap[m.user_id]
      return {
        id: m.id,
        from: m.user_id === user.id ? 'me' : m.user_id,
        senderName: p?.username || p?.name || 'User',
        senderAvatar: p?.avatar_url || null,
        text: m.message || m.content,
        ts: m.created_at,
        status: m.status || 'sent'
      }
    })

    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: formatted
      }
    }))
  },

  sendMessage: async (conversationId, text) => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user || !text.trim()) return

    const tempId = crypto.randomUUID()
    const ts = new Date().toISOString()

    const formatted = {
      id: tempId,
      from: 'me',
      senderName: user.user_metadata?.username || 'Me',
      senderAvatar: user.user_metadata?.avatar_url || null,
      text: text.trim(),
      ts: ts,
      status: 'sent'
    }

    // Optimistic UI update
    set((state) => {
      const currentMsgs = state.messages[conversationId] || []
      // prevent duplicate if realtime beats us somehow (unlikely since we do it sync)
      if (currentMsgs.some(m => m.id === formatted.id)) return state

      const updatedMsgs = [...currentMsgs, formatted]
      const updatedContacts = state.contacts.map(c => {
        if (c.id === conversationId) {
          return { ...c, messages: [formatted] }
        }
        return c
      })

      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMsgs
        },
        contacts: updatedContacts
      }
    })

    // Now insert to DB
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        id: tempId,
        project_id: conversationId,
        user_id: user.id,
        message: text.trim(),
        created_at: ts
      })

    if (error) {
      console.error('[ChatStore] Error sending message:', error.message)
      // Optional: rollback state here if needed
    }
  },

  sendTypingEvent: async (conversationId) => {
    const channel = get().realtimeChannel
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (channel && user) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { conversationId, userId: user.id }
      })
    }
  },

  markAsRead: async (conversationId) => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return
    
    // Attempt to update status to read. Will fail gracefully if column doesn't exist yet.
    const { error } = await supabase
      .from('chat_messages')
      .update({ status: 'read' })
      .eq('project_id', conversationId)
      .neq('user_id', user.id)
      
    if (!error) {
      set((state) => {
        const msgs = state.messages[conversationId] || []
        const updatedMsgs = msgs.map(m => m.from !== 'me' ? { ...m, status: 'read' } : m)
        return {
          messages: {
            ...state.messages,
            [conversationId]: updatedMsgs
          }
        }
      })
    }
  },

  addFriendByCode: async (code, currentUserId) => {
    const member = await lookupMemberCode(code)
    if (!member) {
      throw new Error('Member not found with this code.')
    }

    if (member.userId === currentUserId) {
      throw new Error('You cannot add yourself.')
    }

    // Check if DM already exists
    const existing = get().contacts.find(c => 
      !c.isGroup && c.otherUser?.id === member.userId
    )

    if (existing) {
      set({ activeContactId: existing.id })
      return existing
    }

    // Create a new DM project
    const dmRoomId = crypto.randomUUID()
    const dmName = `DM:${currentUserId}:${member.userId}`

    const { error: projError } = await supabase
      .from('projects')
      .insert({
        id: dmRoomId,
        name: dmName,
        description: 'DM_CHAT',
        owner_id: currentUserId
      })

    if (projError) {
      console.error('[ChatStore] Error creating DM room:', projError.message)
      throw projError
    }

    // Add friend to project_members
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: dmRoomId,
        user_id: member.userId,
        role: 'editor'
      })

    if (memberError) {
      console.error('[ChatStore] Error adding DM collaborator:', memberError.message)
      throw memberError
    }

    // Refresh contact list
    await get().init(currentUserId)
    set({ activeContactId: dmRoomId })
  },

  createGroup: async (groupName, selectedFriendUserIds, currentUserId) => {
    if (!groupName.trim() || selectedFriendUserIds.length === 0) return

    const groupRoomId = crypto.randomUUID()

    // 1. Create group project
    const { error: projError } = await supabase
      .from('projects')
      .insert({
        id: groupRoomId,
        name: groupName.trim(),
        description: 'GROUP_CHAT',
        owner_id: currentUserId
      })

    if (projError) {
      console.error('[ChatStore] Error creating group room:', projError.message)
      throw projError
    }

    // 2. Add members to project_members
    const membersToInsert = selectedFriendUserIds.map(uid => ({
      project_id: groupRoomId,
      user_id: uid,
      role: 'editor'
    }))

    const { error: memberError } = await supabase
      .from('project_members')
      .insert(membersToInsert)

    if (memberError) {
      console.error('[ChatStore] Error adding group members:', memberError.message)
      throw memberError
    }

    // Refresh contacts
    await get().init(currentUserId)
    set({ activeContactId: groupRoomId })
  },

  clearMessages: async (conversationId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Save timestamp locally so messages disappear immediately for the user regardless of RLS
    localStorage.setItem(`cleared_${conversationId}`, new Date().toISOString())

    // 2. Clear from state immediately to trigger UI update
    set((state) => {
      const updatedContacts = state.contacts.map(c => {
        if (c.id === conversationId) return { ...c, messages: [] }
        return c
      })
      return {
        messages: {
          ...state.messages,
          [conversationId]: []
        },
        contacts: updatedContacts
      }
    })

    // 3. Attempt to hard-delete from database (will succeed only if user is project owner, due to RLS)
    await supabase
      .from('chat_messages')
      .delete()
      .eq('project_id', conversationId)
  },

  deleteConversation: async (conversationId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const contact = get().contacts.find(c => c.id === conversationId)
    if (!contact) return

    let error
    if (contact.isGroup) {
      const res = await supabase.from('project_members').delete().eq('project_id', conversationId).eq('user_id', user.id)
      error = res.error
    } else {
      const res = await supabase.from('projects').delete().eq('id', conversationId)
      error = res.error
    }

    if (error) {
      console.error('[ChatStore] Error deleting conversation:', error.message)
      throw error
    }

    set((state) => ({
      contacts: state.contacts.filter(c => c.id !== conversationId),
      activeContactId: state.activeContactId === conversationId ? 'ai_assistant' : state.activeContactId
    }))
  }
}))
