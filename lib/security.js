/*
Scrape by xs0ciety505/xs0cietyHUB
t.me/xs0cietyHUB
wa.me/9779845668812
*/

// Daftar origin yang diizinkan (dari env, pisahkan dengan koma)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// API key opsional — jika di-set, request WAJIB bawa X-API-Key yang cocok
const API_KEY = process.env.API_KEY || '';

// Whitelist ekstensi file (kosongkan array = izinkan semua)
const ALLOWED_EXT = (process.env.ALLOWED_EXT || 'jpg,jpeg,png,gif,webp,mp4,mp3,pdf,zip')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Set header CORS HANYA untuk origin yang diizinkan.
 * Jika origin tidak diizinkan, tidak ada header CORS → browser blok.
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
 * Verifikasi request berasal dari origin yang sah ATAU membawa API key yang benar.
 * Return null jika OK, atau { status, body } jika harus ditolak.
 */
function verifyRequest(req) {
  const origin = req.headers.origin || req.headers.referer || '';

  // 1) Cek Origin / Referer
  const originOk = ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed));

  // 2) Cek API Key (jika di-set)
  let apiKeyOk = true; // default: API key tidak wajib
  if (API_KEY) {
    const provided = req.headers['x-api-key'] || '';
    // gunakan timing-safe compare sederhana
    apiKeyOk = provided.length === API_KEY.length &&
      timingSafeEqualStr(provided, API_KEY);
  }

  // Logika: request dianggap sah jika origin match ATAU api key valid
  // → jika keduanya di-set di env, setidaknya SATU harus lolos.
  //   (Ubah ke `&&` jika Anda ingin WAJIB dua-duanya.)
  const pass = (ALLOWED_ORIGINS.length ? originOk : true) &&
               (API_KEY ? apiKeyOk : true);

  if (pass) return null;

  return {
    status: 403,
    body: {
      success: false,
      error: 'Akses ditolak. Origin tidak diizinkan atau API key tidak valid.',
    },
  };
}

/**
 * Validasi ekstensi file.
 */
function isExtensionAllowed(filename) {
  if (ALLOWED_EXT.length === 0) return true;
  if (!filename) return false;
  const ext = filename.split('.').pop().toLowerCase();
  return ALLOWED_EXT.includes(ext);
}

/**
 * Rate limiter in-memory sederhana.
 * ⚠️ Di Vercel serverless, setiap invocation = fresh memory,
 * jadi ini hanya "best effort". Untuk produksi, pakai Upstash Redis.
 * Format: { ip: [timestamp, timestamp, ...] }
 */
const _buckets = new Map();
const WINDOW_MS = 60_000;           // 1 menit
const MAX_REQ_PER_WINDOW = 10;      // 10 upload / menit / IP

function rateLimit(req) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const now = Date.now();
  const arr = (_buckets.get(ip) || []).filter((t) => now - t < WINDOW_MS);

  if (arr.length >= MAX_REQ_PER_WINDOW) {
    return {
      status: 429,
      body: {
        success: false,
        error: `Rate limit: maksimal ${MAX_REQ_PER_WINDOW} upload/menit.`,
        retry_after_seconds: Math.ceil((WINDOW_MS - (now - arr[0])) / 1000),
      },
    };
  }

  arr.push(now);
  _buckets.set(ip, arr);
  return null;
}

// Perbandingan string constant-time sederhana
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
  ALLOWED_ORIGINS,
};
