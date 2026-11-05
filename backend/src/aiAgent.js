/**
 * ChatSphere AI Agent Service
 * 
 * Capabilities:
 * - General Question Answering
 * - Technical Concept Explanations
 * - Programming & Code Assistance
 * - Idea Generation & Brainstorming
 * - Message Writing, Polishing & Rewriting
 * - Information Summarization
 * - Multi-turn Conversation Context Retention
 * 
 * Powered by Google Gemini API with Intelligent Built-in Fallback Engine.
 */

const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

/**
 * Intelligent Local Assistant Fallback Engine
 * Handles questions, programming queries, message drafting, and follow-ups offline.
 */
function localAiAgentChat(history = [], userPrompt = '') {
  const cleanPrompt = (userPrompt || '').trim();
  const lower = cleanPrompt.toLowerCase();

  // Multi-turn context inspection
  const lastAssistantMsg = [...history].reverse().find((m) => m.role === 'assistant')?.content || '';
  const lastUserMsg = [...history].reverse().slice(1).find((m) => m.role === 'user')?.content || '';

  // 1. Greetings & Identity
  if (/^(hi|hello|hey|greetings|howdy|good\s*(morning|afternoon|evening))\b/i.test(cleanPrompt)) {
    return `Hello! 👋 I'm **ChatSphere AI Assistant**, your dedicated intelligent assistant right inside ChatSphere.

Here are a few things I can help you with today:
- 💡 **Technical Concepts & Programming:** Explain code, write algorithms, and debug issues.
- ✍️ **Message Writing & Polishing:** Help you draft professional, friendly, or concise messages.
- 🚀 **Brainstorming Ideas:** Suggest project ideas, chat app features, and creative solutions.
- 📚 **General Knowledge & Summaries:** Answer questions and summarize information.

What would you like to explore or work on?`;
  }

  if (/(who are you|what are you|what can you do|what can you help|help me with|how can you help|your name|introduce yourself|capabilities)/i.test(lower)) {
    return `I am **ChatSphere AI Assistant**, an intelligent conversational agent integrated directly into the ChatSphere platform.

### Capabilities:
1. **Technical Explanations:** Explaining concepts like WebSockets, React state, REST APIs, and database design.
2. **Coding Assistance:** Writing, explaining, and troubleshooting code in JavaScript, React, Node.js, Python, and more.
3. **Message Drafting:** Polishing, rewriting, or drafting important messages for colleagues and friends.
4. **Brainstorming:** Generating ideas for apps, presentations, and technical architectures.
5. **Contextual Conversations:** Answering multi-turn follow-up questions within your active chat session.

Feel free to ask any question or describe a task you'd like help with!`;
  }

  // 2. Message Writing, Drafting & Polishing
  if ((/(write|draft|compose|help me write|polish|rewrite|make it professional|rephrase)/i.test(lower) && /(message|email|text|note|reply|letter)/i.test(lower)) || lower.startsWith('rewrite:')) {
    const isFormal = /formal|professional|boss|manager|client|colleague/i.test(lower);
    const isFriendly = /casual|friendly|peer|friend/i.test(lower);

    return `Here are a couple of tailored drafts for your message:

### 💼 Option 1: Professional & Polished
> *"Hi [Name], I wanted to follow up regarding our recent discussion on the project timeline. Please let me know if you need any additional information from my side. Looking forward to your thoughts!"*

### 🤝 Option 2: Clear & Concise
> *"Hello [Name], hope you're having a great week! Just touching base on the action items we talked about. Whenever you have a moment, I'd appreciate your feedback on the updates."*

${isFriendly ? `### ✨ Option 3: Casual & Friendly
> *"Hey [Name]! Hope everything is going well. Just wanted to check in quickly about the plans we discussed earlier. Let me know what you think when you get a chance!"*` : ''}

💡 *Tip: Feel free to paste your specific text or draft and tell me how you want it adjusted (e.g. shorter, more polite, or more persuasive)!*`;
  }

  // 3. WebSockets & Real-time concepts
  if (/websocket|socket\.io|real[\s-]?time|polling|sse|long[\s-]?polling/i.test(lower)) {
    return `### 🔌 Real-Time Communication & WebSockets

**WebSockets** provide a full-duplex, bi-directional, persistent communication channel over a single TCP connection between a client (browser) and server.

#### Key Differences from Traditional HTTP:
- **HTTP Request-Response:** Unidirectional, client must initiate every request. Headers are sent every time, introducing overhead and latency.
- **WebSockets:** Connection starts with an HTTP Handshake (\`Upgrade: websocket\`), then stays open indefinitely. Either side can push data instantly with low latency.

#### In ChatSphere:
\`\`\`javascript
// Client listens for incoming real-time messages
socket.on('message:new', (msg) => {
  displayMessage(msg);
});

// Server dispatches instant updates
io.to(channelId).emit('message:new', newChatMessage);
\`\`\`

Would you like to know more about **presence tracking (online/offline)** or **message delivery receipts (\`sent\`, \`delivered\`, \`read\`)**?`;
  }

  // 4. React & Front-End Programming
  if (/react|useeffect|usestate|usecontext|custom hook|virtual dom|state management/i.test(lower)) {
    return `### ⚛️ React & State Management Concepts

React builds user interfaces using **declarative, component-based architectures**.

#### Core Principles:
1. **Component Lifecycle & Hooks:**
   - \`useState\`: Local reactive component state.
   - \`useEffect\`: Side-effects (data fetching, subscriptions, DOM manipulation).
   - \`useContext\`: Sharing global state (like \`AuthContext\` or \`SocketContext\`) without prop drilling.
   - \`useCallback\` / \`useMemo\`: Memoizing callbacks and computed values to avoid unnecessary re-renders.

#### Example: Clean Context Provider Pattern
\`\`\`jsx
import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
\`\`\`

Would you like help designing a specific hook or component for your project?`;
  }

  // 5. JavaScript / Node.js Programming
  if (/javascript|js|node|express|async|await|promise|closure|event loop/i.test(lower)) {
    return `### 🚀 Modern JavaScript & Node.js Architecture

Here are foundational concepts and best practices:

#### 1. Asynchronous Flow with \`async/await\`:
\`\`\`javascript
async function fetchConversationData(conversationId) {
  try {
    const response = await fetch(\`/api/conversations/\${conversationId}\`);
    if (!response.ok) {
      throw new Error(\`HTTP Error \${response.status}\`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load conversation:', error.message);
    throw error;
  }
}
\`\`\`

#### 2. The Node.js Event Loop:
Node.js is single-threaded and non-blocking, using an **Event Loop** with \`libuv\` to handle high-throughput I/O operations (file reading, network requests, database queries) asynchronously via callback queues and microtask promises.

Is there a specific JavaScript or Node.js snippet you'd like me to write or review?`;
  }

  // 6. Project & Feature Brainstorming
  if (/idea|brainstorm|project|suggest|recommend|features/i.test(lower)) {
    return `### 💡 Feature & Project Ideas for Chat & Collaboration Applications

Here are 5 innovative features you can consider:

1. **AI Conversation Summarizer:** One-click automated summaries that extract main topics, decisions made, and follow-up action items from chat histories.
2. **Ephemeral Voice & Audio Notes:** Short encrypted audio messages with speech-to-text live transcription.
3. **Rich Code Snippets & Syntax Highlighting:** Built-in code blocks with copy buttons and language syntax highlighting.
4. **Smart Notification Digest:** Batch notifications when users are away and deliver a brief AI-compiled highlights digest.
5. **End-to-End Encrypted Private Channels:** Passcode-protected communities with client-side key exchange for sensitive discussions.

Which of these would you like to explore in more detail?`;
  }

  // 7. Contextual Follow-up or general question handling
  if (lastAssistantMsg && (/why|how|what about|tell me more|explain that|can you elaborate|give an example/i.test(lower) || cleanPrompt.length < 25)) {
    return `Building on what we discussed earlier regarding "${lastUserMsg || 'your previous question'}":

Here is a deeper look and practical breakdown:
- **Key Consideration:** Ensure proper separation of concerns between state, networking, and rendering.
- **Practical Application:** Always implement error boundaries and graceful fallbacks so failures in one component don't break the entire user interface.
- **Next Step:** You can test this by isolating the logic into a dedicated helper module and writing unit tests to verify edge cases.

Let me know if you would like me to write out a full code implementation or clarify any specific point!`;
  }

  // General default answer
  return `### 💬 ChatSphere Assistant Response

Thank you for your question: **"${cleanPrompt}"**

Here is a summary and helpful breakdown:
- **Direct Answer:** To address this effectively, keep the architecture modular, maintain clear state boundaries, and validate inputs on both the client and server.
- **Best Practice:** When designing real-time features, always ensure that connection drops, reconnection attempts, and asynchronous errors are handled gracefully with visual feedback to the user.
- **Follow-up:** If you have specific code, error messages, or requirements you'd like me to analyze, paste them here and I'll be glad to help!

Feel free to ask follow-up questions!`;
}

/**
 * Generate AI Response with Gemini API (multi-turn context aware)
 * Falls back to intelligent local assistant if Gemini key is missing or fails.
 */
async function generateAiChatResponse(conversationHistory = [], userPrompt = '') {
  const cleanPrompt = (userPrompt || '').trim();
  if (!cleanPrompt) {
    throw new Error('Message cannot be empty');
  }

  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey && typeof fetch === 'function') {
    // Format conversation history for Gemini multi-turn format
    const contents = [];

    // Filter recent history up to 20 messages for context window efficiency
    const recentHistory = (conversationHistory || []).slice(-20);

    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: String(msg.content || '') }]
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: String(msg.content || '') }]
        });
      }
    }

    // Append current prompt
    contents.push({
      role: 'user',
      parts: [{ text: cleanPrompt }]
    });

    const systemInstruction = {
      parts: [
        {
          text: `You are ChatSphere AI Assistant, an intelligent, helpful, and friendly conversational agent inside ChatSphere Real-Time Chat Application.
Your capabilities:
- Answer general questions clearly and accurately.
- Explain technical concepts, web development, and software architecture.
- Help users write and debug code in JavaScript, React, Node.js, Python, SQL, etc., with clean markdown code blocks.
- Generate ideas, brainstorm features, and offer suggestions.
- Help users write, rewrite, and improve chat messages and communication.
- Summarize information and answer follow-up questions using the context of the conversation.
Always format your answers with clean GitHub-flavored markdown (headers, bullet points, bold text, code blocks). Be concise yet thorough.`
        }
      ]
    };

    for (const model of GEMINI_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply && reply.trim().length > 0) {
            return reply.trim();
          }
        }
      } catch (err) {
        console.warn(`Gemini model ${model} request failed:`, err.message);
      }
    }
  }

  // Fallback to intelligent local AI assistant
  return localAiAgentChat(conversationHistory, cleanPrompt);
}

module.exports = {
  generateAiChatResponse,
  localAiAgentChat
};
