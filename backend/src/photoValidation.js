const path = require('path');
const fs = require('fs');
const { UPLOADS_DIR, PROFILE_IMAGES_DIR, hasImage } = require('./storage/imageStore');

/**
 * Validates whether the given avatar URL is a valid, existing, non-placeholder photo:
 * - Rejects temporary local paths: C:\..., blob:..., file://..., data:...
 * - Rejects placeholders: dicebear, default-avatar, etc.
 * - Stored uploads: Must exist in uploads/ or uploads/profile-images/ (checked via imageStore).
 * - External URL: Must be valid HTTP(S) URL (e.g. Google profile photo).
 */
function verifyPhotoStored(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return false;
  const trimmed = avatarUrl.trim();
  if (!trimmed) return false;

  // 1. Explicitly reject temporary local file paths or raw data URLs
  if (
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('data:') ||
    /^[a-zA-Z]:[\\/]/.test(trimmed)
  ) {
    return false;
  }

  // 2. Reject placeholder images, avatar generators, or empty values
  if (
    trimmed.includes('dicebear.com') ||
    trimmed.includes('placeholder.com') ||
    trimmed.includes('default-avatar') ||
    trimmed.includes('via.placeholder') ||
    trimmed.includes('avatar.iran.liara.run')
  ) {
    return false;
  }

  // 3. Stored uploaded files (/uploads/profile-images/... or /uploads/...)
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const filename = path.basename(trimmed);
    const ext = path.extname(filename).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return false;
    }
    return hasImage(trimmed);
  }

  // 4. External URL (e.g. verified Google OAuth profile photo https://lh3.googleusercontent.com/...)
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    try {
      const parsed = new URL(trimmed);
      // If pointing to self /uploads/
      if (parsed.pathname.includes('/uploads/')) {
        return hasImage(parsed.pathname);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  return false;
}

module.exports = {
  UPLOADS_DIR,
  PROFILE_IMAGES_DIR,
  verifyPhotoStored
};
