const path = require('path');
const fs = require('fs');

// Root uploads directory: repo/uploads
const UPLOADS_DIR = path.resolve(__dirname, '..', '..', '..', 'uploads');
const PROFILE_IMAGES_DIR = path.join(UPLOADS_DIR, 'profile-images');
const REGISTRY_FILE = path.resolve(__dirname, '..', '..', 'data', 'image_registry.json');

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROFILE_IMAGES_DIR)) {
    fs.mkdirSync(PROFILE_IMAGES_DIR, { recursive: true });
  }
  const dataDir = path.dirname(REGISTRY_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// In-memory cache of registry
let registryCache = null;

function loadRegistry() {
  if (registryCache !== null) return registryCache;
  ensureDirs();
  if (fs.existsSync(REGISTRY_FILE)) {
    try {
      const data = fs.readFileSync(REGISTRY_FILE, 'utf8');
      registryCache = JSON.parse(data);
      if (!Array.isArray(registryCache)) registryCache = [];
    } catch (e) {
      console.warn('⚠️ Warning loading image_registry.json:', e.message);
      registryCache = [];
    }
  } else {
    registryCache = [];
    saveRegistry();
  }
  return registryCache;
}

function saveRegistry() {
  try {
    ensureDirs();
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registryCache || [], null, 2), 'utf8');
  } catch (e) {
    console.error('❌ Failed to save image_registry.json:', e.message);
  }
}

/**
 * Initializes the image store on server startup.
 * Automatically re-materializes all images from the persistent registry onto disk if missing
 * (e.g., when running on Render's ephemeral filesystem after a restart).
 */
function init() {
  ensureDirs();
  const registry = loadRegistry();
  let restoredCount = 0;

  for (const entry of registry) {
    if (!entry.filename || !entry.dataBase64) continue;
    const diskPath = path.join(PROFILE_IMAGES_DIR, entry.filename);
    if (!fs.existsSync(diskPath)) {
      try {
        const buffer = Buffer.from(entry.dataBase64, 'base64');
        fs.writeFileSync(diskPath, buffer);
        restoredCount++;
      } catch (err) {
        console.warn(`Failed to restore ${entry.filename} to disk:`, err.message);
      }
    }
  }

  if (restoredCount > 0) {
    console.log(`⚡ Re-materialized ${restoredCount} profile images from persistent registry onto disk.`);
  }
}

/**
 * Generates a clean, unique filename for a user's profile image
 */
function generateProfileFilename(userId, originalFilename = 'photo.jpg') {
  const ext = (path.extname(originalFilename || '') || '.jpg').toLowerCase();
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
  const cleanId = (userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `profile_${cleanId}_${timestamp}_${rand}${safeExt}`;
}

/**
 * Saves a profile image buffer to persistent storage:
 * 1. Writes file to uploads/profile-images/<filename>
 * 2. Backs up image data in backend/data/image_registry.json
 * 3. Returns the persistent relative URL and metadata
 */
function saveProfileImage(fileBuffer, originalFilename, mimetype, userId = 'pending') {
  ensureDirs();
  const registry = loadRegistry();
  const filename = generateProfileFilename(userId, originalFilename);
  const diskPath = path.join(PROFILE_IMAGES_DIR, filename);

  // 1. Write to disk
  fs.writeFileSync(diskPath, fileBuffer);

  // 2. Persist in registry
  const base64 = fileBuffer.toString('base64');
  const relativeUrl = `/uploads/profile-images/${filename}`;

  const entry = {
    id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    filename,
    relativeUrl,
    userId: userId || 'pending',
    mimetype: mimetype || 'image/jpeg',
    size: fileBuffer.length,
    dataBase64: base64,
    uploadedAt: new Date().toISOString()
  };

  registry.push(entry);
  saveRegistry();

  return {
    url: relativeUrl,
    filename,
    size: entry.size,
    mimetype: entry.mimetype
  };
}

/**
 * Check if a profile image exists on disk or in the persistent registry
 */
function hasImage(filenameOrPath) {
  if (!filenameOrPath) return false;
  const filename = path.basename(filenameOrPath);
  ensureDirs();

  const diskPath = path.join(PROFILE_IMAGES_DIR, filename);
  if (fs.existsSync(diskPath)) {
    try {
      const stat = fs.statSync(diskPath);
      if (stat.isFile() && stat.size > 0) return true;
    } catch (e) {}
  }

  // Also check root uploads dir for backward compatibility
  const rootDiskPath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(rootDiskPath)) {
    try {
      const stat = fs.statSync(rootDiskPath);
      if (stat.isFile() && stat.size > 0) return true;
    } catch (e) {}
  }

  const registry = loadRegistry();
  return registry.some((r) => r.filename === filename);
}

/**
 * Retrieves image file buffer and mimetype
 */
function getImage(filename) {
  const clean = path.basename(filename);
  const diskPath = path.join(PROFILE_IMAGES_DIR, clean);

  if (fs.existsSync(diskPath)) {
    return {
      buffer: fs.readFileSync(diskPath),
      mimetype: getMimeType(clean)
    };
  }

  // Check registry backup
  const registry = loadRegistry();
  const found = registry.find((r) => r.filename === clean);
  if (found && found.dataBase64) {
    const buffer = Buffer.from(found.dataBase64, 'base64');
    // Ensure written back to disk
    try {
      fs.writeFileSync(diskPath, buffer);
    } catch (e) {}
    return {
      buffer,
      mimetype: found.mimetype || getMimeType(clean)
    };
  }

  return null;
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg';
  }
}

/**
 * Cleans up an older profile picture when user replaces it
 */
function deleteOldProfileImage(oldAvatarUrl, currentUserId) {
  if (!oldAvatarUrl || typeof oldAvatarUrl !== 'string') return;
  if (!oldAvatarUrl.includes('/profile-images/')) return;

  const filename = path.basename(oldAvatarUrl);
  const diskPath = path.join(PROFILE_IMAGES_DIR, filename);

  if (fs.existsSync(diskPath)) {
    try {
      fs.unlinkSync(diskPath);
    } catch (e) {
      // Ignore deletion errors
    }
  }

  const registry = loadRegistry();
  registryCache = registry.filter((r) => r.filename !== filename);
  saveRegistry();
}

module.exports = {
  UPLOADS_DIR,
  PROFILE_IMAGES_DIR,
  init,
  saveProfileImage,
  hasImage,
  getImage,
  deleteOldProfileImage
};
