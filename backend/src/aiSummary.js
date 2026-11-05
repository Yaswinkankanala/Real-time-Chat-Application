/**
 * ChatSphere AI Summary Engine – 1-to-1 Personal Conversations
 * 
 * Strict Single Purpose:
 * - Summarize 1-to-1 personal chat conversations.
 * - Does NOT participate in conversations.
 * - Does NOT send messages.
 * - Does NOT summarize channels.
 * - Does NOT access tokens or passwords.
 * 
 * Structure:
 * 1. Conversation Overview
 * 2. Main Topics Discussed
 * 3. Important Points
 * 4. Decisions Made
 * 5. Pending Tasks
 * 6. Important Dates and Deadlines
 * 7. Overall Summary
 */

/**
 * Intelligent Rule-based NLP Summarizer
 * Extracts structured summary sections accurately from raw messages.
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
  const decisions = [];
  const pendingTasks = [];
  const datesAndDeadlines = [];
  const topicKeywords = new Map();

  const decisionKeywords = [
    'agree', 'agreed', 'plan', 'planned', 'decide', 'decided', 'confirmed',
    'confirm', 'sounds good', 'let\'s do', 'perfect', 'ok done', 'settled',
    'will do', 'deal', 'finalized', 'finalize'
  ];

  const dateKeywords = [
    'tomorrow', 'today', 'tonight', 'yesterday',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december',
    'deadline', 'schedule', 'scheduled', 'pm', 'am', 'o\'clock', 'noon', 'midnight'
  ];

  const taskKeywords = [
    'need to', 'have to', 'should', 'must', 'action item', 'todo', 'task',
    'please send', 'please share', 'let me know', 'follow up', 'check on',
    'remind', 'prepare', 'work on'
  ];

  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'her', 'was', 'one',
    'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see',
    'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with',
    'this', 'that', 'have', 'from', 'they', 'will', 'what', 'when', 'make', 'like', 'time', 'just',
    'know', 'take', 'them', 'some', 'than', 'then', 'into', 'could', 'good', 'your', 'about', 'yeah', 'okay'
  ]);

  cleanMsgs.forEach((msg) => {
    const text = msg.content;
    const lower = text.toLowerCase();

    // 1. Identify Decisions Made
    const hasDecision = decisionKeywords.some((kw) => lower.includes(kw));
    if (hasDecision) {
      if (decisions.length < 4 && !decisions.includes(text)) {
        decisions.push(`${msg.sender}: "${text}"`);
      }
    }

    // 2. Identify Important Dates and Deadlines
    const hasDate = dateKeywords.some((kw) => lower.includes(kw));
    if (hasDate) {
      if (datesAndDeadlines.length < 4 && !datesAndDeadlines.includes(text)) {
        datesAndDeadlines.push(`${msg.sender}: "${text}"`);
      }
    }

    // 3. Identify Pending Tasks & Questions
    const isQuestion =
      lower.includes('?') ||
      lower.startsWith('what ') ||
      lower.startsWith('when ') ||
      lower.startsWith('where ') ||
      lower.startsWith('how ') ||
      lower.startsWith('can you') ||
      lower.startsWith('could you') ||
      lower.startsWith('are you');

    const hasTask = taskKeywords.some((kw) => lower.includes(kw));

    if (isQuestion || hasTask) {
      if (pendingTasks.length < 5 && !pendingTasks.includes(text)) {
        pendingTasks.push(`${msg.sender}: "${text}"`);
      }
      if (questions.length < 4 && !questions.includes(text)) {
        questions.push(`${msg.sender}: "${text}"`);
      }
    }

    // 4. Important Points (Key Information)
    if (hasDecision || hasDate || text.length > 25) {
      if (importantPoints.length < 5 && !importantPoints.includes(text)) {
        importantPoints.push(`${msg.sender}: ${text}`);
      }
    }

    // 5. Significant Topic Keywords
    const words = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    words.forEach((w) => {
      if (w.length > 3 && !stopWords.has(w)) {
        topicKeywords.set(w, (topicKeywords.get(w) || 0) + 1);
      }
    });
  });

  // Top keywords
  const sortedKeywords = Array.from(topicKeywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([kw]) => kw.charAt(0).toUpperCase() + kw.slice(1));

  // Main Topics
  const mainTopics = [];
  if (sortedKeywords.length > 0) {
    mainTopics.push(`Discussion regarding ${sortedKeywords.slice(0, 2).join(' and ')}`);
    if (sortedKeywords.length > 2) {
      mainTopics.push(`Updates on ${sortedKeywords.slice(2).join(' & ')}`);
    }
  } else {
    mainTopics.push(`Direct conversation between ${otherUserName} and ${currentUserName}`);
  }

  // Fallback for important points if empty
  if (importantPoints.length === 0) {
    cleanMsgs.slice(-3).forEach((m) => {
      importantPoints.push(`${m.sender}: ${m.content}`);
    });
  }

  // Backward compatibility discussions
  const pendingDiscussions =
    pendingTasks.length > 0
      ? pendingTasks
      : questions.length > 0
        ? questions
        : ['No pending questions or action items currently awaiting a reply.'];

  // 1. Overview
  const overview = `Personal one-to-one conversation between ${otherUserName} and ${currentUserName} covering ${cleanMsgs.length} messages. Primary focus centers on ${mainTopics[0]?.toLowerCase() || 'general discussion'}.`;

  // 7. Overall Summary
  const overallSummary = `Both ${otherUserName} and ${currentUserName} discussed key topics with ${decisions.length > 0 ? `${decisions.length} confirmed decision(s)` : 'general updates'}${datesAndDeadlines.length > 0 ? ` and upcoming timeline events noted` : ''}. All communication is active and up to date.`;

  return {
    empty: false,
    generatedAt: new Date().toISOString(),
    overview,
    mainTopics,
    importantPoints,
    decisions,
    pendingTasks,
    datesAndDeadlines,
    overallSummary,
    // Backwards compatibility fields
    summaryText: overview,
    pendingDiscussions
  };
}

/**
 * Generate AI Summary using Google Gemini API if configured, with local NLP fallback.
 */
async function generateSummary(messagesList, otherUserName = 'Friend', currentUserName = 'You') {
  if (!messagesList || messagesList.length === 0) {
    return {
      empty: true,
      message: 'There are no messages available to summarize yet.'
    };
  }

  if (process.env.GEMINI_API_KEY && typeof fetch === 'function') {
    try {
      const formattedTranscript = messagesList
        .slice(-60)
        .map((m) => `${m.sender?.displayName || m.sender?.username || 'User'}: ${m.content || ''}`)
        .join('\n');

      const prompt = `You are ChatSphere Personal AI. Your sole job is to summarize this one-to-one personal conversation between "${currentUserName}" and "${otherUserName}".
Never invent decisions, dates, tasks, or statements. Distinguish confirmed decisions from suggestions.
Omit empty sections if there is no relevant information.

Return ONLY a JSON object with this exact structure:
{
  "overview": "Brief 1-2 sentence explanation of what the conversation is about",
  "mainTopics": ["Topic 1", "Topic 2"],
  "importantPoints": ["Key point 1", "Key point 2"],
  "decisions": ["Decision 1 if any, or empty array"],
  "pendingTasks": ["Task or question needing attention if any, or empty array"],
  "datesAndDeadlines": ["Date/time/deadline mentioned if any, or empty array"],
  "overallSummary": "Short final summary of the complete conversation"
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
          const overview = parsed.overview || 'Personal conversation summary.';
          const mainTopics = Array.isArray(parsed.mainTopics) && parsed.mainTopics.length > 0 ? parsed.mainTopics : ['General Conversation'];
          const importantPoints = Array.isArray(parsed.importantPoints) ? parsed.importantPoints : [];
          const decisions = Array.isArray(parsed.decisions) ? parsed.decisions : [];
          const pendingTasks = Array.isArray(parsed.pendingTasks) ? parsed.pendingTasks : [];
          const datesAndDeadlines = Array.isArray(parsed.datesAndDeadlines) ? parsed.datesAndDeadlines : [];
          const overallSummary = parsed.overallSummary || overview;

          return {
            empty: false,
            generatedAt: new Date().toISOString(),
            overview,
            mainTopics,
            importantPoints,
            decisions,
            pendingTasks,
            datesAndDeadlines,
            overallSummary,
            // Backwards compatibility fields
            summaryText: overview,
            pendingDiscussions: pendingTasks.length > 0 ? pendingTasks : ['No pending questions or action items currently awaiting a reply.']
          };
        }
      }
    } catch (apiErr) {
      console.warn('Gemini API call failed, falling back to local NLP summarizer:', apiErr.message);
    }
  }

  return localNlpSummarize(messagesList, otherUserName, currentUserName);
}

module.exports = {
  generateSummary,
  localNlpSummarize
};
