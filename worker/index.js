/*
Scrape by xs0ciety505/xs0cietyHUB
t.me/xs0cietyHUB
wa.me/9779845668812
*/

const CATBOX_ENDPOINT = 'https://catbox.moe/user/api.php';
const TIMEOUT_MS = 30_000;

const ALLOWED_EXT = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
  'mp4', 'webm', 'mov', 'mkv',
  'mp3', 'wav', 'ogg', 'm4a',
  'pdf', 'zip', 'rar', '7z', 'txt', 'json',
];

function corsHeaders(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const h = new Headers({
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  });
  if (allowed.includes(origin)) {
    h.set('Access-Control-Allow-Origin', origin);
    h.set('Vary', 'Origin');
  }
  return h;
}

function isExtAllowed(name) {
  if (!name) return false;
  const ext = name.split('.').pop().toLowerCase();
  return ALLOWED_EXT.includes(ext);
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(cors) },
  });
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ success: false, error: 'Gunakan POST.' }, 405, cors);

    // Cek Origin (Hanya izinkan xs0cietylabsz.biz.id)
    const origin = req.headers.get('Origin') || req.headers.get('Referer') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.length === 0 || !allowed.some(a => origin.startsWith(a))) {
      return json({ success: false, error: 'Origin tidak diizinkan.' }, 403, cors);
    }

    const ct = req.headers.get('Content-Type') || '';
    if (!ct.includes('multipart/form-data')) {
      return json({ success: false, error: 'Content-Type harus multipart/form-data.' }, 415, cors);
    }

    try {
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return json({ success: false, error: 'Field "file" wajib berisi file.' }, 400, cors);
      }
      if (!isExtAllowed(file.name)) {
        return json({ success: false, error: `Tipe file tidak diizinkan: ${file.name}` }, 400, cors);
      }

      const catboxForm = new FormData();
      catboxForm.append('reqtype', 'fileupload');
      if (env.CATBOX_USERHASH) catboxForm.append('userhash', env.CATBOX_USERHASH);
      catboxForm.append('fileToUpload', file, file.name);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(CATBOX_ENDPOINT, {
        method: 'POST',
        body: catboxForm,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const text = (await res.text()).trim();

      if (res.ok && /^https?:\/\/files\.catbox\.moe\//.test(text)) {
        return json({ success: true, url: text, host: 'catbox', timestamp: new Date().toISOString() }, 200, cors);
      }
      return json({ success: false, error: text || `Catbox HTTP ${res.status}`, host: 'catbox', timestamp: new Date().toISOString() }, 502, cors);

    } catch (err) {
      return json({ success: false, error: err.name === 'AbortError' ? 'Timeout' : err.message, timestamp: new Date().toISOString() }, 500, cors);
    }
  },
};
