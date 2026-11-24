/*
Scrape by xs0ciety505/xs0cietyHUB
t.me/xs0cietyHUB
wa.me/9779845668812
*/

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_EXT = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
  'mp4', 'webm', 'mov', 'mkv',
  'mp3', 'wav', 'ogg', 'm4a',
  'pdf', 'zip', 'rar', '7z', 'txt', 'json',
];

const WINDOW_MS = 60_000;
const MAX_REQ_PER_MIN = 20;
const _buckets = new Map();

function applyCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function verifyOrigin(req) {
  const origin = req.headers.origin || req.headers.referer || '';
  const ok = ALLOWED_ORIGINS.some((a) => origin.startsWith(a));
  if (ok) return null;
  return { status: 403, body: { success: false, error: 'Origin tidak diizinkan.' } };
}

function isExtensionAllowed(filename) {
  if (!filename) return false;
  const ext = filename.split('.').pop().toLowerCase();
  return ALLOWED_EXT.includes(ext);
}

function rateLimit(req) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const now = Date.now();
  const arr = (_buckets.get(ip) || []).filter((t) => now - t < WINDOW_MS);

  if (arr.length >= MAX_REQ_PER_MIN) {
    return {
      status: 429,
      body: {
        success: false,
        error: `Rate limit: maksimal ${MAX_REQ_PER_MIN} upload/menit.`,
        retry_after_seconds: Math.ceil((WINDOW_MS - (now - arr[0])) / 1000),
      },
    };
  }
  arr.push(now);
  _buckets.set(ip, arr);
  return null;
}

module.exports = { applyCors, verifyOrigin, isExtensionAllowed, rateLimit };
