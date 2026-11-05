const { verifyToken } = require('./auth');
const { users, messages, channels, conversations } = require('./db');
const { enrichMessage } = require('./routes/chatRoutes');

// Map of userId -> Set of socket IDs
const onlineUsers = new Map();

function setupSocket(io) {
  // Socket.io JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid or expired token'));
    }

    const user = users.findById(decoded.id);
    if (!user) {
      return next(new Error('User not found'));
    }
    if (!user.profileCompleted) {
      return next(new Error('Profile registration incomplete. Complete all mandatory details first.'));
    }

    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;

    // Track online user sockets
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal user room for direct messages
    socket.join(`user:${userId}`);

    // Automatically join Socket.IO rooms for all channels user is a member/owner of
    try {
      const userChannels = channels.find((c) => {
        return c.ownerId === userId || (Array.isArray(c.members) && c.members.includes(userId));
      });
      userChannels.forEach((c) => {
        socket.join(`channel:${c.id}`);
      });
    } catch (chanErr) {
      console.error('Error auto-joining user channel rooms:', chanErr);
    }

    // Broadcast updated online users list
    io.emit('presence:list', Array.from(onlineUsers.keys()));

    // When user reconnects, check for unread messages sent to them and update status to 'delivered'
    const pendingDirectMsgs = messages.find(
      (m) => m.recipientId === userId && m.status === 'sent'
    );
    if (pendingDirectMsgs.length > 0) {
      pendingDirectMsgs.forEach((m) => {
        messages.update(m.id, { status: 'delivered' });
        const updated = enrichMessage(m);
        io.to(`user:${m.senderId}`).emit('message:updated', updated);
        socket.emit('message:new', updated);
      });
    }

    // Join channel room (validates membership for private channels!)
    const handleJoinChannel = (channelId, callback) => {
      if (!channelId) {
        if (callback) callback({ error: 'channelId is required' });
        return;
      }

      const channel = channels.findById(channelId);
      if (!channel) {
        if (callback) callback({ error: 'Channel not found' });
        return;
      }

      const isMember = channel.ownerId === userId || (Array.isArray(channel.members) && channel.members.includes(userId));
      if (channel.isPrivate && !isMember) {
        if (callback) callback({ error: 'Access denied: Passcode required to join this channel' });
        return;
      }

      if (!isMember) {
        channels.addMember(channelId, userId);
      }

      socket.join(`channel:${channelId}`);
      if (callback) callback({ status: 'ok', channelId });
    };

    socket.on('channel:join', handleJoinChannel);
    socket.on('join_channel', handleJoinChannel);

    // Leave channel room
    const handleLeaveChannel = (channelId) => {
      if (channelId) {
        socket.leave(`channel:${channelId}`);
      }
    };

    socket.on('channel:leave', handleLeaveChannel);
    socket.on('leave_channel', handleLeaveChannel);

    // Send a message (Channel or Direct)
    const handleSendMessage = async (data, callback) => {
      try {
        const { channelId, recipientId, content, attachment } = data;

        if (!content?.trim() && !attachment) {
          if (callback) callback({ error: 'Message content or attachment is required' });
          return;
        }

        // 1. Channel message handling
        if (channelId) {
          const channel = channels.findById(channelId);
          if (!channel) {
            if (callback) callback({ error: 'Channel not found' });
            return;
          }

          const isMember = channel.ownerId === userId || (Array.isArray(channel.members) && channel.members.includes(userId));
          if (channel.isPrivate && !isMember) {
            if (callback) callback({ error: 'Access denied: Passcode required to view or message in this channel' });
            return;
          }

          if (!isMember) {
            channels.addMember(channelId, userId);
          }

          socket.join(`channel:${channelId}`);

          const cleanContent = content ? content.trim() : '';

          const newMsg = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            channelId,
            conversationId: null,
            recipientId: null,
            senderId: userId,
            content: cleanContent,
            attachment: attachment || null,
            status: 'sent',
            readBy: [userId],
            reactions: {},
            createdAt: new Date().toISOString()
          };

          messages.create(newMsg);
          const enriched = enrichMessage(newMsg);

          // Broadcast to all sockets in the channel room
          io.to(`channel:${channelId}`).emit('message:new', enriched);
          io.to(`channel:${channelId}`).emit('receive_channel_message', enriched);

          // Guarantee sender receipt via personal room
          io.to(`user:${userId}`).emit('message:new', enriched);
          io.to(`user:${userId}`).emit('receive_channel_message', enriched);

          if (callback) {
            callback({
              status: 'ok',
              message: enriched
            });
          }
          return;
        }

        // 2. Direct 1-to-1 message handling
        let conversationId = null;
        let isRecipientOffline = false;

        if (recipientId) {
          if (recipientId === userId) {
            if (callback) callback({ error: 'Cannot send a message to yourself' });
            return;
          }

          const recipient = users.findById(recipientId);
          if (!recipient) {
            if (callback) callback({ error: 'Recipient user does not exist' });
            return;
          }

          const conv = conversations.findOrCreate(userId, recipientId);
          conversationId = conv.id;

          // Check if recipient is online
          const recipientSockets = onlineUsers.get(recipientId);
          isRecipientOffline = !recipientSockets || recipientSockets.size === 0;

          const cleanContent = content ? content.trim() : '';

          const newMsg = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            channelId: null,
            conversationId,
            recipientId,
            senderId: userId,
            content: cleanContent,
            attachment: attachment || null,
            status: isRecipientOffline ? 'sent' : 'delivered',
            readBy: [userId],
            reactions: {},
            createdAt: new Date().toISOString()
          };

          messages.create(newMsg);
          conversations.update(conversationId, { lastMessage: newMsg });

          const enriched = enrichMessage(newMsg);

          // Emit to sender socket
          io.to(`user:${userId}`).emit('message:new', enriched);

          // If recipient is online, emit to recipient
          if (!isRecipientOffline) {
            io.to(`user:${recipientId}`).emit('message:new', enriched);
          }

          if (callback) {
            callback({
              status: 'ok',
              message: enriched,
              isRecipientOffline
            });
          }
          return;
        }

        if (callback) callback({ error: 'Either channelId or recipientId must be provided' });
      } catch (err) {
        console.error('Socket message:send error:', err);
        if (callback) callback({ error: 'Failed to send message: ' + err.message });
      }
    };

    socket.on('message:send', handleSendMessage);
    socket.on('send_channel_message', handleSendMessage);

    // Message reaction
    socket.on('message:react', (data) => {
      const { messageId, emoji } = data;
      const msg = messages.findById(messageId);
      if (!msg) return;

      if (!msg.reactions) msg.reactions = {};
      if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

      const userIdx = msg.reactions[emoji].indexOf(userId);
      if (userIdx !== -1) {
        msg.reactions[emoji].splice(userIdx, 1);
        if (msg.reactions[emoji].length === 0) {
          delete msg.reactions[emoji];
        }
      } else {
        msg.reactions[emoji].push(userId);
      }

      messages.update(messageId, { reactions: msg.reactions });
      const enriched = enrichMessage(msg);

      if (msg.channelId) {
        io.to(`channel:${msg.channelId}`).emit('message:updated', enriched);
      } else if (msg.recipientId) {
        io.to(`user:${msg.recipientId}`).emit('message:updated', enriched);
        io.to(`user:${msg.senderId}`).emit('message:updated', enriched);
      }
    });

    // Typing start
    socket.on('typing:start', (data) => {
      const { channelId, recipientId } = data;
      const eventData = {
        userId,
        username: socket.user.username,
        displayName: socket.user.displayName,
        channelId,
        recipientId,
        isTyping: true
      };

      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:status', eventData);
      } else if (recipientId) {
        socket.to(`user:${recipientId}`).emit('typing:status', eventData);
      }
    });

    // Typing stop
    socket.on('typing:stop', (data) => {
      const { channelId, recipientId } = data;
      const eventData = {
        userId,
        username: socket.user.username,
        displayName: socket.user.displayName,
        channelId,
        recipientId,
        isTyping: false
      };

      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:status', eventData);
      } else if (recipientId) {
        socket.to(`user:${recipientId}`).emit('typing:status', eventData);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        if (onlineUsers.get(userId).size === 0) {
          onlineUsers.delete(userId);
        }
      }

      io.emit('presence:list', Array.from(onlineUsers.keys()));
    });
  });
}

module.exports = { setupSocket };
