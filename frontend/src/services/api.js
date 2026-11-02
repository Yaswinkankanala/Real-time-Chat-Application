const isDev = typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000');

function getCustomBackendUrl() {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chatsphere_backend_url');
      if (stored && stored.trim()) return stored.trim();
    }
  } catch (e) {}
  return null;
}

const defaultBaseUrl = isDev
  ? 'http://localhost:5000/api'
  : (typeof window !== 'undefined' && window.location.origin ? `${window.location.origin}/api` : 'http://localhost:5000/api');

// Normalize API URL: ensures /api suffix and removes any trailing slash
function normalizeApiUrl(url) {
  const custom = getCustomBackendUrl();
  const target = custom || url || defaultBaseUrl;
  let clean = target.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    clean += '/api';
  }
  return clean;
}

export function getBaseUrl() {
  return normalizeApiUrl(import.meta.env.VITE_API_URL);
}

function getHeaders() {
  const token = localStorage.getItem('chatsphere_auth_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const currentBase = getBaseUrl();
  const url = `${currentBase}${endpoint}`;
  const headers = options.isFormData
    ? {
      ...(localStorage.getItem('chatsphere_auth_token')
        ? { Authorization: `Bearer ${localStorage.getItem('chatsphere_auth_token')}` }
        : {})
    }
    : { ...getHeaders(), ...(options.headers || {}) };

  const config = {
    ...options,
    headers
  };

  if (options.body && !options.isFormData && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    throw new Error(`Cannot connect to Backend at ${currentBase}. Please verify your Render Backend URL.`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(
      `Backend API not reached at ${currentBase}. The server returned an HTML page. Please set VITE_API_URL in Render or enter your Backend URL in "Firebase Keys & Server Settings".`
    );
  }

  let data = {};
  try {
    data = await response.json();
  } catch (parseErr) {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    throw new Error(`Invalid response received from API at ${url}`);
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Authentication
  verifyFirebaseToken: (idToken, extra = {}) =>
    request('/auth/verify', {
      method: 'POST',
      body: { idToken, ...extra }
    }),

  login: (login, password) =>
    request('/auth/login', {
      method: 'POST',
      body: { login, password }
    }),

  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: payload
    }),

  getMe: () => request('/auth/me'),

  logoutApi: () =>
    request('/auth/logout', {
      method: 'POST'
    }),

  // Users
  getUsers: () => request('/users'),

  searchUsers: (query) => request(`/users/search?q=${encodeURIComponent(query || '')}`),

  getUserById: (id) => request(`/users/${id}`),

  updateProfile: (updates) =>
    request('/users/profile', {
      method: 'PUT',
      body: updates
    }),

  // Conversations (1-to-1)
  getConversations: () => request('/conversations'),

  createConversation: (targetUserId) =>
    request('/conversations', {
      method: 'POST',
      body: { targetUserId }
    }),

  getConversationMessages: (convId) => request(`/conversations/${convId}/messages`),

  // Messages
  sendMessage: (payload) =>
    request('/messages', {
      method: 'POST',
      body: payload
    }),

  markMessageRead: (messageId) =>
    request(`/messages/${messageId}/read`, {
      method: 'PUT'
    }),

  reactToMessage: (messageId, emoji) =>
    request(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: { emoji }
    }),

  // Channels with Passcodes
  getChannels: () => request('/channels'),

  createChannel: (data) =>
    request('/channels', {
      method: 'POST',
      body: data
    }),

  joinChannel: (channelId, passcode = null) =>
    request('/channels/join', {
      method: 'POST',
      body: { channelId, passcode }
    }),

  getChannelDetails: (channelId) => request(`/channels/${channelId}`),

  getChannelMessages: (channelId) => request(`/channels/${channelId}/messages`),

  leaveChannel: (channelId) =>
    request(`/channels/${channelId}/leave`, {
      method: 'POST'
    }),

  regeneratePasscode: (channelId) =>
    request(`/channels/${channelId}/passcode`, {
      method: 'PUT'
    }),

  deleteChannel: (channelId) =>
    request(`/channels/${channelId}`, {
      method: 'DELETE'
    }),

  // Uploads
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/upload', {
      method: 'POST',
      isFormData: true,
      body: formData
    });
  },

  // Nova AI
  askAi: (prompt, context = '') =>
    request('/ai/chat', {
      method: 'POST',
      body: { prompt, context }
    }),

  getSmartReplies: (messageContent) =>
    request('/ai/smart-reply', {
      method: 'POST',
      body: { messageContent }
    }),

  summarizeChat: ({ channelId, targetUserId }) =>
    request('/ai/summarize', {
      method: 'POST',
      body: { channelId, targetUserId }
    })
};
