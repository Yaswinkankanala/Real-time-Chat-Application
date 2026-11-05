const express = require('express');
const { users, conversations, messages, aiConversations, sanitizeUser } = require('../db');
const { authMiddleware } = require('../auth');
const { generateAiChatResponse } = require('../aiAgent');
const { generateSummary } = require('../aiSummary');

const router = express.Router();

// All AI endpoints require authenticated users
router.use(authMiddleware);

// Middleware: Enforce completed profile
function requireCompletedProfile(req, res, next) {
  const user = users.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User account not found' });
  }
  if (!user.profileCompleted) {
    return res.status(403).json({
      error: 'Incomplete registration. Please complete your profile to access AI features.',
      requireProfileCompletion: true
    });
  }
  next();
}

router.use(requireCompletedProfile);

/**
 * GET /api/ai/conversations
 * Retrieve all AI conversations belonging to the logged-in user.
 */
router.get('/conversations', (req, res) => {
  const currentUserId = req.user.id;
  const userAiConvs = aiConversations.findForUser(currentUserId);
  return res.json({ conversations: userAiConvs });
});

/**
 * POST /api/ai/conversations
 * Create a new AI conversation session for the logged-in user.
 */
router.post('/conversations', (req, res) => {
  const currentUserId = req.user.id;
  const { title } = req.body;
  const newConv = aiConversations.create(
    currentUserId,
    title?.trim() || 'New AI Conversation'
  );
  return res.status(201).json({ conversation: newConv });
});

/**
 * GET /api/ai/conversations/:id
 * Retrieve a specific AI conversation with its message history.
 */
router.get('/conversations/:id', (req, res) => {
  const currentUserId = req.user.id;
  const conv = aiConversations.findById(req.params.id);

  if (!conv) {
    return res.status(404).json({ error: 'AI conversation not found' });
  }

  // Security: Strictly prevent users from accessing other users' AI conversations
  if (conv.userId !== currentUserId) {
    return res.status(403).json({ error: 'Access denied to this AI conversation' });
  }

  return res.json({ conversation: conv });
});

/**
 * DELETE /api/ai/conversations/:id
 * Delete a specific AI conversation.
 */
router.delete('/conversations/:id', (req, res) => {
  const currentUserId = req.user.id;
  const conv = aiConversations.findById(req.params.id);

  if (!conv) {
    return res.status(404).json({ error: 'AI conversation not found' });
  }

  if (conv.userId !== currentUserId) {
    return res.status(403).json({ error: 'Access denied: You can only delete your own AI conversations' });
  }

  aiConversations.delete(req.params.id, currentUserId);
  return res.json({ success: true, message: 'AI conversation deleted successfully', id: req.params.id });
});

/**
 * POST /api/ai/chat
 * Send a message to the ChatSphere AI Agent and receive a contextual response.
 */
router.post('/chat', async (req, res) => {
  const currentUserId = req.user.id;
  const { message, conversationId } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const cleanMessage = message.trim();

  // Find or create AI conversation session
  let conv = null;
  if (conversationId) {
    conv = aiConversations.findById(conversationId);
    if (conv && conv.userId !== currentUserId) {
      return res.status(403).json({ error: 'Access denied to this AI conversation' });
    }
  }

  if (!conv) {
    // Generate intelligent title from initial message (first 35 characters)
    let initialTitle = cleanMessage.slice(0, 35);
    if (cleanMessage.length > 35) initialTitle += '...';
    // Capitalize first letter
    initialTitle = initialTitle.charAt(0).toUpperCase() + initialTitle.slice(1);
    conv = aiConversations.create(currentUserId, initialTitle);
  }

  try {
    // 1. Record user message
    const userMsg = aiConversations.addMessage(conv.id, {
      role: 'user',
      content: cleanMessage
    });

    // 2. Generate response with multi-turn context
    const aiReplyText = await generateAiChatResponse(conv.messages, cleanMessage);

    // 3. Record assistant response
    const assistantMsg = aiConversations.addMessage(conv.id, {
      role: 'assistant',
      content: aiReplyText
    });

    // Refresh conversation object
    const updatedConv = aiConversations.findById(conv.id);

    return res.json({
      success: true,
      conversationId: conv.id,
      conversation: updatedConv,
      userMessage: userMsg,
      reply: assistantMsg
    });
  } catch (err) {
    console.error('AI Chat Error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to process AI request. Please try again.'
    });
  }
});

/**
 * POST /api/ai/summarize-chat
 * AI Chat Summary - EXCLUSIVELY for 1-to-1 Personal Conversations
 * Receives conversationId or targetUserId, verifies participant membership,
 * retrieves actual messages from backend, and generates structured summary.
 */
router.post('/summarize-chat', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { conversationId, targetUserId } = req.body;

    const targetId = conversationId || targetUserId;
    if (!targetId) {
      return res.status(400).json({ error: 'Conversation or target user ID is required' });
    }

    // Resolve conversation
    let conv = conversations.findById(targetId);
    if (!conv) {
      conv = conversations.findByParticipants(currentUserId, targetId);
    }
    if (!conv) {
      conv = conversations.findOrCreate(currentUserId, targetId);
    }

    // Security: Check participation
    if (!conv || !Array.isArray(conv.participants) || !conv.participants.includes(currentUserId)) {
      return res.status(403).json({
        error: 'Access denied: You can only summarize personal conversations that you participate in.'
      });
    }

    // Security: Reject channels
    if (conv.isChannel || conv.channelId) {
      return res.status(400).json({
        error: 'AI Chat Summary is only permitted for one-to-one personal conversations.'
      });
    }

    const otherUserId = conv.participants.find((p) => p !== currentUserId) || currentUserId;
    const otherUser = users.findById(otherUserId);
    const currentUser = users.findById(currentUserId);

    // Retrieve actual backend stored messages (never channels)
    const convMsgs = messages
      .find(
        (m) =>
          !m.channelId &&
          (m.conversationId === conv.id ||
            (m.senderId === currentUserId && m.recipientId === otherUserId) ||
            (m.senderId === otherUserId && m.recipientId === currentUserId))
      )
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (convMsgs.length === 0) {
      return res.json({
        empty: true,
        conversationId: conv.id,
        message: 'There are no messages available to summarize yet.'
      });
    }

    const summary = await generateSummary(
      convMsgs,
      otherUser?.displayName || otherUser?.username || 'Friend',
      currentUser?.displayName || currentUser?.username || 'You'
    );

    return res.json({
      success: true,
      conversationId: conv.id,
      otherUser: otherUser ? sanitizeUser(otherUser, currentUserId) : null,
      summary
    });
  } catch (err) {
    console.error('AI summary error in /api/ai/summarize-chat:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate conversation summary. Please try again.'
    });
  }
});

module.exports = router;

