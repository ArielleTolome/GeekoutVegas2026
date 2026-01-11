const crypto = require('crypto');
const path = require('path');

/**
 * Generate a hash from a string (for deterministic filenames)
 */
function hashString(str) {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 12);
}

/**
 * Create a safe folder name from a hostname
 */
function safeFolderName(hostname) {
  return hostname
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 50);
}

/**
 * Generate output folder name with timestamp
 */
function generateOutputFolder(url) {
  const urlObj = new URL(url);
  const safeName = safeFolderName(urlObj.hostname);
  const timestamp = Date.now();
  return `${safeName}_${timestamp}`;
}

/**
 * Normalize and validate a URL
 */
function normalizeUrl(inputUrl) {
  let url = inputUrl.trim();

  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Validate URL
  try {
    const parsed = new URL(url);
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsed.href;
  } catch (e) {
    throw new Error(`Invalid URL: ${inputUrl}`);
  }
}

/**
 * Get file extension from URL or content-type
 */
function getExtension(url, contentType = '') {
  // Try to get from URL first
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const ext = path.extname(pathname).toLowerCase();
    if (ext && ext.length <= 5) {
      return ext;
    }
  } catch (e) {}

  // Fallback to content-type
  const mimeToExt = {
    'text/html': '.html',
    'text/css': '.css',
    'text/javascript': '.js',
    'application/javascript': '.js',
    'application/json': '.json',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/x-icon': '.ico',
    'image/vnd.microsoft.icon': '.ico',
    'font/woff': '.woff',
    'font/woff2': '.woff2',
    'font/ttf': '.ttf',
    'font/otf': '.otf',
    'application/font-woff': '.woff',
    'application/font-woff2': '.woff2',
    'application/x-font-ttf': '.ttf',
    'application/x-font-otf': '.otf',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
  };

  const baseMime = contentType.split(';')[0].trim().toLowerCase();
  return mimeToExt[baseMime] || '';
}

/**
 * Determine asset type from URL or content-type
 */
function getAssetType(url, contentType = '') {
  const ext = getExtension(url, contentType).toLowerCase();

  if (['.css'].includes(ext)) return 'css';
  if (['.js'].includes(ext)) return 'js';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp'].includes(ext)) return 'images';
  if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) return 'fonts';
  if (['.mp4', '.webm', '.ogg', '.mov'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.flac', '.aac'].includes(ext)) return 'audio';

  // Check content-type if extension didn't help
  const mime = contentType.split(';')[0].trim().toLowerCase();
  if (mime.startsWith('image/')) return 'images';
  if (mime.startsWith('font/') || mime.includes('font')) return 'fonts';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'text/css') return 'css';
  if (mime.includes('javascript')) return 'js';

  return 'other';
}

/**
 * Check if URL is a data URL
 */
function isDataUrl(url) {
  return url && url.trim().startsWith('data:');
}

/**
 * Check if URL is absolute
 */
function isAbsoluteUrl(url) {
  return url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//'));
}

/**
 * Resolve a URL against a base URL
 */
function resolveUrl(baseUrl, relativeUrl) {
  if (!relativeUrl || isDataUrl(relativeUrl)) {
    return relativeUrl;
  }

  try {
    // Handle protocol-relative URLs
    if (relativeUrl.startsWith('//')) {
      const base = new URL(baseUrl);
      return base.protocol + relativeUrl;
    }

    return new URL(relativeUrl, baseUrl).href;
  } catch (e) {
    return relativeUrl;
  }
}

/**
 * Parse srcset attribute and return array of URLs
 */
function parseSrcset(srcset) {
  if (!srcset) return [];

  return srcset
    .split(',')
    .map(part => {
      const trimmed = part.trim();
      const spaceIndex = trimmed.lastIndexOf(' ');
      if (spaceIndex > 0) {
        return trimmed.substring(0, spaceIndex).trim();
      }
      return trimmed;
    })
    .filter(url => url && !isDataUrl(url));
}

/**
 * Extract URLs from CSS content
 */
function extractCssUrls(cssContent) {
  const urls = [];
  const urlRegex = /url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;
  let match;

  while ((match = urlRegex.exec(cssContent)) !== null) {
    const url = match[1];
    if (url && !isDataUrl(url) && !url.startsWith('#')) {
      urls.push(url);
    }
  }

  return urls;
}

/**
 * Generate a deterministic filename for an asset
 */
function generateAssetFilename(url, contentType = '') {
  const hash = hashString(url);
  const ext = getExtension(url, contentType);
  return hash + ext;
}

module.exports = {
  hashString,
  safeFolderName,
  generateOutputFolder,
  normalizeUrl,
  getExtension,
  getAssetType,
  isDataUrl,
  isAbsoluteUrl,
  resolveUrl,
  parseSrcset,
  extractCssUrls,
  generateAssetFilename,
};
