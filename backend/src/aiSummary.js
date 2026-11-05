/**
 * ChatSphere Personal AI – Chat Summary Only
 * 
 * Strict Single Purpose:
 * - Summarize 1-to-1 personal chat conversations.
 * - Does NOT participate in conversations.
 * - Does NOT send messages.
 * - Does NOT summarize channels.
 * - Does NOT access tokens or passwords.
 */

/**
 * Intelligent Rule-based NLP Summarizer
 * Produces structured summaries: Main Topics, Important Points, Pending Discussions.
 */
function localNlpSummarize(messagesList, otherUserName = 'Friend', currentUserName = 'You') {
  if (!messagesList || messagesList.length === 0) {
    return {
      empty: true,
      message: 'There are no messages available to summarize yet.'
    };
  }

  const cleanMsgs = messagesList
    .map((m) => ({
      sender: m.sender?.displayName || m.sender?.username || (m.senderId ? 'User' : 'Friend'),
      content: (m.content || '').trim()
    }))
    .filter((m) => m.content.length > 0);

  if (cleanMsgs.length === 0) {
    return {
      empty: true,
      message: 'There are no messages available to summarize yet.'
    };
  }

  const questions = [];
  const importantPoints = [];
  const topicKeywords = new Map();

  const decisionTriggers = [
    'agree', 'agreed', 'plan', 'planned', 'meet', 'meeting', 'tomorrow', 'today',
    'saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'schedule', 'scheduled', 'decided', 'confirmed', 'confirm', 'deadline',
    'location', 'time', 'call', 'will do', 'sounds good', 'let\'s do', 'perfect', 'ok done'
  ];

  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'her', 'was', 'one',
    'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see',
    'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with',
    'this', 'that', 'have', 'from', 'they', 'will', 'what', 'when', 'make', 'like', 'time', 'just',
    'know', 'take', 'them', 'some', 'than', 'then', 'into', 'could', 'good', 'your', 'about'
  ]);

  cleanMsgs.forEach((msg) => {
    const text = msg.content;
    const lower = text.toLowerCase();

    // 1. Identify Pending Questions / Discussions
    if (
      lower.includes('?') ||
      lower.startsWith('what ') ||
      lower.startsWith('when ') ||
      lower.startsWith('where ') ||
      lower.startsWith('how ') ||
      lower.startsWith('can you') ||
      lower.startsWith('could you') ||
      lower.startsWith('are you') ||
      lower.includes('let me know')
    ) {
      if (questions.length < 4 && !questions.includes(text)) {
        questions.push(`${msg.sender}: "${text}"`);
      }
    }

    // 2. Identify Important Points & Decisions
    const hasDecisionTrigger = decisionTriggers.some((kw) => lower.includes(kw));
    if (hasDecisionTrigger) {
      if (importantPoints.length < 5 && !importantPoints.includes(text)) {
        importantPoints.push(`${msg.sender}: ${text}`);
      }
    }

    // 3. Extract Significant Topics
    const words = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    words.forEach((w) => {
      if (w.length > 3 && !stopWords.has(w)) {
        topicKeywords.set(w, (topicKeywords.get(w) || 0) + 1);
      }
    });
  });

  // Sort top keywords for topics
  const sortedKeywords = Array.from(topicKeywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([kw]) => kw.charAt(0).toUpperCase() + kw.slice(1));

  // Synthesize Main Topics
  const mainTopics = [];
  if (sortedKeywords.length > 0) {
    mainTopics.push(`Discussion regarding ${sortedKeywords.slice(0, 2).join(' and ')}`);
    if (sortedKeywords.length > 2) {
      mainTopics.push(`Updates on ${sortedKeywords.slice(2).join(' & ')}`);
    }
  } else {
    mainTopics.push(`Conversation between ${otherUserName} and ${currentUserName}`);
  }

  // Ensure default fallback if points are sparse
  if (importantPoints.length === 0) {
    cleanMsgs.slice(-3).forEach((m) => {
      importantPoints.push(`${m.sender}: ${m.content}`);
    });
  }

  // Format pending discussions
  const pendingDiscussions =
    questions.length > 0
      ? questions
      : ['No pending questions or action items currently awaiting a reply.'];

  // Summary Text Overview
  const summaryText = `Personal conversation between ${otherUserName} and ${currentUserName} covering ${cleanMsgs.length} messages. Key focus includes ${mainTopics[0]?.toLowerCase() || 'general discussion'}.`;

  return {
    empty: false,
    summaryText,
    mainTopics,
    importantPoints,
    pendingDiscussions
  };
}

/**
 * Generate AI Summary using Gemini API if available, with robust local NLP fallback
 */
async function generateSummary(messagesList, otherUserName = 'Friend', currentUserName = 'You') {
  if (!messagesList || messagesList.length === 0) {
    return {
      empty: true,
      message: 'There are no messages available to summarize yet.'
    };
  }

  // If Gemini API Key is configured, attempt high-fidelity generative summary
  if (process.env.GEMINI_API_KEY && typeof fetch === 'function') {
    try {
      const formattedTranscript = messagesList
        .slice(-60)
        .map((m) => `${m.sender?.displayName || m.sender?.username || 'User'}: ${m.content || ''}`)
        .join('\n');

      const prompt = `You are ChatSphere Personal AI. Your sole job is to summarize this one-to-one conversation between "${currentUserName}" and "${otherUserName}".
Never hallucinate or invent facts. Never include private credentials. Return ONLY a JSON object with this exact structure:
{
  "summaryText": "Concise 1-2 sentence overview of the conversation",
  "mainTopics": ["Topic 1", "Topic 2"],
  "importantPoints": ["Key point or decision 1", "Key point or decision 2"],
  "pendingDiscussions": ["Pending question or unanswered topic if any, or empty array if none"]
}

Transcript:
${formattedTranscript}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return {
            empty: false,
            summaryText: parsed.summaryText || 'Conversation summary generated successfully.',
            mainTopics: Array.isArray(parsed.mainTopics) && parsed.mainTopics.length > 0 ? parsed.mainTopics : ['General Conversation'],
            importantPoints: Array.isArray(parsed.importantPoints) ? parsed.importantPoints : [],
            pendingDiscussions: Array.isArray(parsed.pendingDiscussions) && parsed.pendingDiscussions.length > 0
              ? parsed.pendingDiscussions
              : ['No pending questions or action items currently awaiting a reply.']
          };
        }
      }
    } catch (apiErr) {
      console.warn('Gemini API call failed, using intelligent local NLP summarizer:', apiErr.message);
    }
  }

  // Fast, intelligent local summarizer
  return localNlpSummarize(messagesList, otherUserName, currentUserName);
}

module.exports = {
  generateSummary,
  localNlpSummarize
};

