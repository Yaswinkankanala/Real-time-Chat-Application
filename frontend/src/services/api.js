const isDev = typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000');

// Canonical backend hosts
const PRODUCTION_BACKEND_HOST = 'https://chatsphere-backend-jqnf.onrender.com';
const DEVELOPMENT_BACKEND_HOST = 'http://localhost:5000';

/**
 * Returns the backend root host (WITHOUT /api, WITHOUT trailing slash)
 * Guaranteed: "https://chatsphere-backend-jqnf.onrender.com" or "http://localhost:5000"
 */
export function getBackendHost() {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chatsphere_backend_url');
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
      }
    }
  } catch (e) {}

  const envBackend = import.meta.env.VITE_BACKEND_URL;
  if (envBackend && envBackend.trim()) {
    return envBackend.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  const envApi = import.meta.env.VITE_API_URL;
  if (envApi && envApi.trim()) {
    return envApi.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  return isDev ? DEVELOPMENT_BACKEND_HOST : PRODUCTION_BACKEND_HOST;
}

/**
 * Returns the canonical backend API base URL (WITH /api, WITHOUT trailing slash)
 * Guaranteed: "https://chatsphere-backend-jqnf.onrender.com/api" or "http://localhost:5000/api"
 * Never creates duplicate /api/api!
 */
export function getBaseUrl() {
  const host = getBackendHost();
  return `${host}/api`;
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
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${currentBase}${cleanEndpoint}`;

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
    if (!navigator.onLine) {
      throw new Error('You appear to be offline. Please check your internet connection.');
    }
    throw new Error(
      `Cannot connect to Backend at ${currentBase}. If this is a cold start on Render, please wait a moment and click Retry.`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(
      `Backend API not reached at ${currentBase}. The server returned an HTML page. Please verify your Render service is running.`
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
    const errorMsg =
      data.error ||
      (response.status === 401
        ? 'Authentication session expired. Please log in again.'
        : response.status === 403
        ? 'Access denied to this conversation.'
        : response.status === 404
        ? 'Resource not found on server.'
        : `Request failed with status ${response.status}`);
    throw new Error(errorMsg);
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

  // Users & Profile
  getUsers: () => request('/users'),

  searchUsers: (query) => request(`/users/search?q=${encodeURIComponent(query || '')}`),

  getUserById: (id) => request(`/users/${id}`),

  updateProfile: (updates) =>
    request('/users/profile', {
      method: 'PUT',
      body: updates
    }),

  deleteAccount: () =>
    request('/users/account', {
      method: 'DELETE'
    }),

  // File Upload (Images & Attachments)
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/upload', {
      method: 'POST',
      body: formData,
      isFormData: true
    });
  },

  // Conversations (1-to-1)
  getConversations: () => request('/conversations'),

  createConversation: (targetUserId) =>
    request('/conversations', {
      method: 'POST',
      body: { targetUserId }
    }),

  getDirectMessages: (targetUserId) => request(`/conversations/${targetUserId}/messages`),

  // AI Chat Summary (1-to-1 Personal Conversations ONLY)
  summarizeConversation: (idOrTargetUserId) =>
    request(`/conversations/${idOrTargetUserId}/summarize`, {
      method: 'POST'
    }),

  summarizeChat: (payload) =>
    request('/ai/summarize-chat', {
      method: 'POST',
      body: payload
    }),

  // AI Agent Conversations & Chat
  sendAiMessage: (message, conversationId) =>
    request('/ai/chat', {
      method: 'POST',
      body: { message, conversationId }
    }),

  getAiConversations: () => request('/ai/conversations'),

  createAiConversation: (title) =>
    request('/ai/conversations', {
      method: 'POST',
      body: { title }
    }),

  getAiConversationById: (id) => request(`/ai/conversations/${id}`),

  deleteAiConversation: (id) =>
    request(`/ai/conversations/${id}`, {
      method: 'DELETE'
    }),

  // Channels
  getChannels: () => request('/channels'),

  createChannel: (channelData) =>
    request('/channels', {
      method: 'POST',
      body: channelData
    }),

  joinChannel: (channelId, passcode) =>
    request(`/channels/${channelId}/join`, {
      method: 'POST',
      body: { passcode }
    }),

  leaveChannel: (channelId) =>
    request(`/channels/${channelId}/leave`, {
      method: 'POST'
    }),

  getChannelMessages: (channelId) => request(`/channels/${channelId}/messages`),

  sendChannelMessage: (channelId, payload) =>
    request(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: typeof payload === 'string' ? { content: payload } : payload
    }),

  getChannelDetails: (channelId) => request(`/channels/${channelId}`),

  deleteChannel: (channelId) =>
    request(`/channels/${channelId}`, {
      method: 'DELETE'
    })
};
