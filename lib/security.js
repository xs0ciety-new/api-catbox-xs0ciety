/*
Scrape by xs0ciety505/xs0cietyHUB
t.me/xs0cietyHUB
wa.me/9779845668812
*/

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const API_KEY = process.env.API_KEY || '';

const ALLOWED_EXT = (process.env.ALLOWED_EXT || 'jpg,jpeg,png,gif,webp,mp4,mp3,pdf,zip')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Set header CORS hanya untuk origin yang diizinkan.
 */
function applyCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Verifikasi request.
 * - Jika ALLOWED_ORIGINS di-set → wajib Origin/Referer cocok
 * - Jika API_KEY di-set → wajib X-API-Key cocok
 * - Jika keduanya di-set → WAJIB dua-duanya
 */
function verifyRequest(req) {
  const originHeader = req.headers.origin || req.headers.referer || '';

  const originOk =
    ALLOWED_ORIGINS.length === 0 ||
    ALLOWED_ORIGINS.some((allowed) => originHeader.startsWith(allowed));

  let apiKeyOk = true;
  if (API_KEY) {
    const provided = req.headers['x-api-key'] || '';
    apiKeyOk =
      provided.length === API_KEY.length &&
      timingSafeEqualStr(provided, API_KEY);
  }

  if (originOk && apiKeyOk) return null;

  return {
    status: 403,
    body: {
      success: false,
      error: 'Akses ditolak. Origin atau API key tidak valid.',
    },
  };
}

function isExtensionAllowed(filename) {
  if (ALLOWED_EXT.length === 0) return true;
  if (!filename) return false;
  const ext = filename.split('.').pop().toLowerCase();
  return ALLOWED_EXT.includes(ext);
}

// In-memory rate limiter (best-effort di Vercel)
const _buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_REQ = parseInt(process.env.RATE_LIMIT_PER_MIN || '20', 10);

function rateLimit(req) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const now = Date.now();
  const arr = (_buckets.get(ip) || []).filter((t) => now - t < WINDOW_MS);

  if (arr.length >= MAX_REQ) {
    return {
      status: 429,
      body: {
        success: false,
        error: `Rate limit: maksimal ${MAX_REQ} upload/menit.`,
        retry_after_seconds: Math.ceil((WINDOW_MS - (now - arr[0])) / 1000),
      },
    };
  }
  arr.push(now);
  _buckets.set(ip, arr);
  return null;
}

function timingSafeEqualStr(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

module.exports = {
  applyCors,
  verifyRequest,
  isExtensionAllowed,
  rateLimit,
};
