const isDev = typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000');
const defaultBaseUrl = isDev
  ? 'http://localhost:5000/api'
  : (typeof window !== 'undefined' && window.location.origin ? `${window.location.origin}/api` : 'http://localhost:5000/api');
const BASE_URL = import.meta.env.VITE_API_URL || defaultBaseUrl;

function getHeaders() {
  const token = localStorage.getItem('chatsphere_auth_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
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

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Authentication
  verifyFirebaseToken: (idToken) =>
    request('/auth/verify', {
      method: 'POST',
      body: { idToken }
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
