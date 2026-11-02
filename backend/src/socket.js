const { verifyToken } = require('./auth');
const { users, messages, channels, conversations } = require('./db');
const { enrichMessage } = require('./routes/chatRoutes');
const { getAgentReply, AI_AGENT_PROFILE } = require('./aiAgent');

// Map of userId -> Set of socket IDs
const onlineUsers = new Map();

function setupSocket(io) {
  // Always mark AI agent as online
  onlineUsers.set('usr_nova_ai', new Set(['socket_ai_agent_internal']));

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

    // Broadcast updated online users list
    io.emit('presence:list', Array.from(onlineUsers.keys()));

    // Join channel room (validates membership for private channels!)
    socket.on('channel:join', (channelId, callback) => {
      const channel = channels.findById(channelId);
      if (!channel) {
        if (callback) callback({ error: 'Channel not found' });
        return;
      }

      if (channel.isPrivate && !channels.isMember(channelId, userId)) {
        if (callback) callback({ error: 'Access denied: Passcode required to join this channel' });
        return;
      }

      socket.join(`channel:${channelId}`);
      if (callback) callback({ status: 'ok' });
    });

    // Leave channel room
    socket.on('channel:leave', (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    // Send a message (Channel or Direct)
    socket.on('message:send', async (data, callback) => {
      try {
        const { channelId, recipientId, content, attachment } = data;

        if (!content?.trim() && !attachment) {
          if (callback) callback({ error: 'Message content or attachment is required' });
          return;
        }

        // Validate channel permissions if channel message
        if (channelId) {
          const channel = channels.findById(channelId);
          if (!channel) {
            if (callback) callback({ error: 'Channel not found' });
            return;
          }
          if (channel.isPrivate && !channels.isMember(channelId, userId)) {
            if (callback) callback({ error: 'Access denied to private channel' });
            return;
          }
        }

        let conversationId = null;
        if (recipientId) {
          const conv = conversations.findOrCreate(userId, recipientId);
          conversationId = conv.id;
        }

        const cleanContent = content ? content.trim() : '';

        const newMsg = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          channelId: channelId || null,
          conversationId,
          recipientId: recipientId || null,
          senderId: userId,
          content: cleanContent,
          attachment: attachment || null,
          status: 'sent',
          readBy: [userId],
          reactions: {},
          createdAt: new Date().toISOString()
        };

        messages.create(newMsg);
        if (conversationId) {
          conversations.update(conversationId, { lastMessage: newMsg });
        }

        const enriched = enrichMessage(newMsg);

        if (channelId) {
          io.to(`channel:${channelId}`).emit('message:new', enriched);
        } else if (recipientId) {
          io.to(`user:${recipientId}`).emit('message:new', enriched);
          io.to(`user:${userId}`).emit('message:new', enriched);
        }

        if (callback) callback({ status: 'ok', message: enriched });

        // Trigger Nova AI if conditions are met
        const isAiLounge = channelId === 'chan_ai_lounge';
        const mentionsAi = /(?:@nova|@ai|@bot|\/ai)/i.test(cleanContent);
        const isDmToAi = recipientId === 'usr_nova_ai';

        if ((channelId && (isAiLounge || mentionsAi)) || isDmToAi) {
          const typingEvent = {
            userId: 'usr_nova_ai',
            username: AI_AGENT_PROFILE.username,
            displayName: AI_AGENT_PROFILE.displayName,
            channelId: channelId || null,
            recipientId: isDmToAi ? userId : null,
            isTyping: true
          };

          if (channelId) {
            io.to(`channel:${channelId}`).emit('typing:status', typingEvent);
          } else {
            io.to(`user:${userId}`).emit('typing:status', typingEvent);
          }

          setTimeout(async () => {
            try {
              let context = '';
              if (channelId) {
                const recents = messages
                  .find((m) => m.channelId === channelId)
                  .slice(-5)
                  .map((m) => `${m.senderId}: ${m.content}`)
                  .join('\n');
                context = recents;
              }

              const promptToAi = cleanContent
                .replace(/@nova\b/gi, '')
                .replace(/@ai\b/gi, '')
                .replace(/@bot\b/gi, '')
                .replace(/^\/ai\s*/i, '')
                .trim() || 'Hello Nova!';

              const aiReplyText = await getAgentReply(promptToAi, context);

              const aiMsg = {
                id: `msg_ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                channelId: channelId || null,
                conversationId: isDmToAi ? conversationId : null,
                recipientId: isDmToAi ? userId : null,
                senderId: 'usr_nova_ai',
                content: aiReplyText,
                attachment: null,
                status: 'read',
                readBy: ['usr_nova_ai', userId],
                reactions: {},
                createdAt: new Date().toISOString()
              };

              messages.create(aiMsg);
              if (conversationId) {
                conversations.update(conversationId, { lastMessage: aiMsg });
              }

              const enrichedAiMsg = enrichMessage(aiMsg);

              if (channelId) {
                io.to(`channel:${channelId}`).emit('typing:status', { ...typingEvent, isTyping: false });
                io.to(`channel:${channelId}`).emit('message:new', enrichedAiMsg);
              } else {
                io.to(`user:${userId}`).emit('typing:status', { ...typingEvent, isTyping: false });
                io.to(`user:${userId}`).emit('message:new', enrichedAiMsg);
              }
            } catch (err) {
              console.error('Error in Nova AI socket reply:', err);
            }
          }, 600);
        }
      } catch (err) {
        console.error('Error in socket message:send:', err);
        if (callback) callback({ error: 'Failed to send message' });
      }
    });

    // Mark message as read
    socket.on('message:mark_read', ({ messageId }) => {
      const msg = messages.findById(messageId);
      if (msg) {
        const readBy = msg.readBy || [];
        if (!readBy.includes(userId)) {
          readBy.push(userId);
          const updated = messages.update(messageId, { status: 'read', readBy });
          const enriched = enrichMessage(updated);

          if (msg.channelId) {
            io.to(`channel:${msg.channelId}`).emit('message:updated', enriched);
          } else {
            io.to(`user:${msg.senderId}`).emit('message:updated', enriched);
            io.to(`user:${userId}`).emit('message:updated', enriched);
          }
        }
      }
    });

    // Message reaction toggle
    socket.on('message:react', ({ messageId, emoji }, callback) => {
      try {
        const msg = messages.findById(messageId);
        if (!msg) {
          if (callback) callback({ error: 'Message not found' });
          return;
        }

        const currentReactions = msg.reactions || {};
        const usersForEmoji = currentReactions[emoji] || [];

        if (usersForEmoji.includes(userId)) {
          currentReactions[emoji] = usersForEmoji.filter((id) => id !== userId);
          if (currentReactions[emoji].length === 0) {
            delete currentReactions[emoji];
          }
        } else {
          currentReactions[emoji] = [...usersForEmoji, userId];
        }

        const updated = messages.update(messageId, { reactions: currentReactions });
        const enriched = enrichMessage(updated);

        if (updated.channelId) {
          io.to(`channel:${updated.channelId}`).emit('message:updated', enriched);
        } else if (updated.recipientId) {
          io.to(`user:${updated.recipientId}`).emit('message:updated', enriched);
          io.to(`user:${updated.senderId}`).emit('message:updated', enriched);
        }

        if (callback) callback({ status: 'ok', message: enriched });
      } catch (err) {
        console.error('Error handling message:react:', err);
        if (callback) callback({ error: 'Failed to react' });
      }
    });

    // Typing indicators
    socket.on('typing:start', ({ channelId, recipientId }) => {
      const payload = {
        userId: socket.user.id,
        username: socket.user.username,
        displayName: socket.user.displayName,
        channelId,
        recipientId,
        isTyping: true
      };

      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:status', payload);
      } else if (recipientId) {
        socket.to(`user:${recipientId}`).emit('typing:status', payload);
      }
    });

    socket.on('typing:stop', ({ channelId, recipientId }) => {
      const payload = {
        userId: socket.user.id,
        channelId,
        recipientId,
        isTyping: false
      };

      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:status', payload);
      } else if (recipientId) {
        socket.to(`user:${recipientId}`).emit('typing:status', payload);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (onlineUsers.has(userId)) {
        const userSockets = onlineUsers.get(userId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('presence:list', Array.from(onlineUsers.keys()));
        }
      }
    });
  });
}

module.exports = {
  setupSocket,
  onlineUsers
};
