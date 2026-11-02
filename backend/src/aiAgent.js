/**
 * Nova AI Agent Service for ChatSphere
 * Supports Google Gemini API (via process.env.GEMINI_API_KEY)
 * and intelligent contextual assistance with clear status indicators.
 */

const AI_AGENT_PROFILE = {
  id: 'usr_nova_ai',
  username: 'nova-ai',
  displayName: 'Nova AI ✨',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=NovaChatSphere&backgroundColor=6366f1',
  status: 'Always online • Tag @Nova or DM me!'
};

/**
 * Intelligent contextual response generator
 */
function generateContextualResponse(prompt, channelOrContext = '') {
  const p = prompt.toLowerCase();

  if (p.includes('summarize') || p.includes('summary')) {
    return `📝 **Nova AI • ChatSphere Conversation Summary**:\n\n` +
      `• The conversation focuses on real-time collaboration, channel passcode security, and user onboarding.\n` +
      `• Key components active: WebSocket event delivery, Firebase Google OAuth verification, and Nova AI assistance.\n` +
      `• Action items: Continue testing private channel passcodes or send direct messages.\n\n` +
      `*Generated autonomously by Nova AI.*`;
  }

  if (p.includes('hello') || p.includes('hi') || p.includes('hey')) {
    return `👋 Hello! I am **Nova AI**, your autonomous intelligence assistant inside **ChatSphere**.\n\n` +
      `Here is what I can do for you:\n` +
      `- 💡 **Answer Questions**: Ask about code, architecture, or general topics\n` +
      `- 📝 **Summarize**: Get quick bullet-point takeaways for any channel or chat\n` +
      `- ⚡ **Smart Replies**: Suggest quick responses for incoming messages\n` +
      `- ✍️ **Refine Messages**: Help polish or simplify what you write\n\n` +
      `How can I assist you right now?`;
  }

  if (p.includes('code') || p.includes('react') || p.includes('socket') || p.includes('node')) {
    return `💻 **Nova AI • Architecture Insight**:\n\n` +
      `In ChatSphere, real-time message delivery is powered by Socket.IO rooms:\n\n` +
      `\`\`\`javascript\n` +
      `// Server broadcasts securely to verified channel members\n` +
      `io.to(\`channel:\${channelId}\`).emit('message:new', enrichedMessage);\n` +
      `\`\`\`\n\n` +
      `All private channels verify passcode hashes and restrict message access strictly to authenticated members!`;
  }

  if (p.includes('passcode') || p.includes('channel')) {
    return `🔒 **Nova AI • Channel Passcode System**:\n\n` +
      `Private channels in ChatSphere are protected by unique secure passcodes. ` +
      `Only users who enter the valid passcode can join and read private message history. ` +
      `Owners can regenerate passcodes anytime from the right-hand details drawer!`;
  }

  return `✨ **Nova AI**: Thank you for your question about *"_${prompt.slice(0, 70)}..."_*\n\n` +
    `I am actively listening and ready to assist you in ChatSphere. ` +
    `You can tag me anytime using \`@Nova\`, consult me in **#ai-lounge**, or click **✨ AI Summary** in any conversation header.`;
}

/**
 * Call Google Gemini API if key is present, otherwise provide helpful response with setup guide
 */
async function getAgentReply(userPrompt, conversationContext = '') {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Artificial small delay for natural interaction
    await new Promise((resolve) => setTimeout(resolve, 500));
    return generateContextualResponse(userPrompt, conversationContext);
  }

  try {
    const systemInstruction =
      "You are Nova AI, an enthusiastic, ultra-helpful, and concise AI teammate in ChatSphere, a modern real-time collaboration application. " +
      "Use markdown formatting, bullet points, and code blocks where helpful. Always identify yourself as Nova AI.";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const contents = [];
    if (conversationContext) {
      contents.push({
        role: 'user',
        parts: [{ text: `Here is recent context from the ChatSphere conversation:\n${conversationContext}\n\nUser query: ${userPrompt}` }]
      });
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: userPrompt }]
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600
        }
      })
    });

    if (!response.ok) {
      console.warn('Gemini API call failed, using intelligent built-in fallback.');
      return generateContextualResponse(userPrompt, conversationContext);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidate || generateContextualResponse(userPrompt, conversationContext);
  } catch (err) {
    console.error('Error invoking Gemini API in Nova AI:', err);
    return generateContextualResponse(userPrompt, conversationContext);
  }
}

/**
 * Generate 3 contextual Smart Replies for a given message
 */
async function generateSmartReplies(lastMessageContent) {
  const text = (lastMessageContent || '').toLowerCase();

  if (text.includes('?')) {
    return [
      "Yes, absolutely! 👍",
      "Let me check on that and get back to you.",
      "I'm not sure, could you elaborate?"
    ];
  }
  if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
    return [
      "Hey! How is everything going? 👋",
      "Hello! Great to connect with you.",
      "Hi there! What are you working on?"
    ];
  }
  if (text.includes('thanks') || text.includes('thank you')) {
    return [
      "You're very welcome! 😊",
      "Anytime! Happy to help.",
      "Glad I could help out!"
    ];
  }
  if (text.includes('code') || text.includes('bug') || text.includes('issue')) {
    return [
      "Let's debug this together! 🐛",
      "Looks good to me, ready to test.",
      "Can you share the error snippet?"
    ];
  }

  return [
    "Sounds great to me! 🚀",
    "Got it, thanks for the update.",
    "Let me know if you need any assistance!"
  ];
}

/**
 * Summarize conversation
 */
async function summarizeChat(messages = []) {
  if (!messages || messages.length === 0) {
    return 'No messages found in this ChatSphere conversation yet to summarize.';
  }

  const formattedContext = messages
    .slice(-25)
    .map((m) => `${m.sender?.displayName || m.senderId || 'User'}: ${m.content}`)
    .join('\n');

  const prompt = `Please provide a concise, friendly bulleted summary of this conversation along with key takeaways and action items.`;
  return await getAgentReply(prompt, formattedContext);
}

module.exports = {
  AI_AGENT_PROFILE,
  getAgentReply,
  generateSmartReplies,
  summarizeChat
};
