const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Validates whether the given avatar URL is a valid, existing, non-placeholder photo:
 * - Local upload: Must exist in uploads/ directory, size > 0, valid image extension (.jpg, .jpeg, .png, .webp).
 * - External URL: Must be valid HTTP(S) URL and NOT a placeholder/dicebear generator.
 */
function verifyPhotoStored(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return false;
  const trimmed = avatarUrl.trim();
  if (!trimmed) return false;

  // Reject placeholder images, avatars generators, or empty values
  if (
    trimmed.includes('dicebear.com') ||
    trimmed.includes('placeholder.com') ||
    trimmed.includes('default-avatar') ||
    trimmed.includes('via.placeholder') ||
    trimmed.includes('avatar.iran.liara.run')
  ) {
    return false;
  }

  // Local uploaded file
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const filename = path.basename(trimmed);
    const diskPath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(diskPath)) return false;
    try {
      const stat = fs.statSync(diskPath);
      if (!stat.isFile() || stat.size === 0) return false;
      const ext = path.extname(filename).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    } catch (e) {
      return false;
    }
  }

  // External URL (e.g. Google profile picture https://lh3.googleusercontent.com/...)
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    try {
      new URL(trimmed);
      return true;
    } catch (e) {
      return false;
    }
  }

  return false;
}

module.exports = {
  UPLOADS_DIR,
  verifyPhotoStored
};
