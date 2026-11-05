import { getBaseUrl } from '../services/api';

/**
 * Resolves a profile avatar path or URL into a fully accessible image URL:
 * - Direct HTTP/HTTPS URLs (e.g. Google photos, Cloudinary, etc.) are preserved.
 * - Relative /uploads/... or /uploads/profile-images/... paths are resolved against the active backend server URL.
 * - Local filesystem paths (C:\..., blob:..., file://...) or empty strings safely fall back to Dicebear SVG.
 */
export function resolveAvatarUrl(avatar, displayName = 'User') {
  if (!avatar || typeof avatar !== 'string') {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName || 'User')}`;
  }

  const trimmed = avatar.trim();

  // Guard against temporary local paths or raw data URLs that cannot be shared
  if (
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('file://') ||
    /^[a-zA-Z]:[\\/]/.test(trimmed)
  ) {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName || 'User')}`;
  }

  // If already absolute HTTP or HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Clean relative path
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // Get active backend host without /api
  try {
    const apiBase = getBaseUrl(); // e.g. "https://chatsphere-backend-xxx.onrender.com/api" or "http://localhost:5000/api"
    const backendOrigin = apiBase.replace(/\/api\/?$/, '');
    return `${backendOrigin}${cleanPath}`;
  } catch (e) {
    // Fallback if window/api is unavailable
    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}${cleanPath}`;
    }
    return cleanPath;
  }
}

/**
 * Graceful error fallback for <img> tags.
 * If an image fails to load (e.g. temporary network blip or deleted file),
 * automatically switches to the initials fallback without breaking layout.
 */
export function handleAvatarError(e, displayName = 'User') {
  if (e && e.target) {
    e.target.onerror = null; // Prevent infinite loop
    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName || 'User')}`;
  }
}
