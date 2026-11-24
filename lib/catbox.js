/*
Scrape by xs0ciety505/xs0cietyHUB
t.me/xs0cietyHUB
wa.me/9779845668812
*/

const CATBOX_ENDPOINT = 'https://catbox.moe/user/api.php';
const X0_ENDPOINT = 'https://x0.at/';
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://catbox.moe',
  Referer: 'https://catbox.moe/',
};

async function uploadToCatbox({ file, filename }) {
  if (!file) throw new Error('file wajib diisi');
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', file, filename || 'upload.bin');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(CATBOX_ENDPOINT, {
        method: 'POST',
        headers: BROWSER_HEADERS,
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const text = (await res.text()).trim();

      if (res.ok && /^https?:\/\/files\.catbox\.moe\//.test(text)) {
        return { success: true, url: text, host: 'catbox' };
      }

      if (/invalid uploader/i.test(text)) {
        return {
          success: false,
          error: text,
          host: 'catbox',
          fallback: true,
        };
      }

      if (res.status >= 500 && attempt < MAX_RETRIES) {
        lastError = `Catbox HTTP ${res.status}: ${text.slice(0, 200)}`;
        await sleep(500 * (attempt + 1));
        continue;
      }

      return {
        success: false,
        error: text || `Catbox HTTP ${res.status}`,
        host: 'catbox',
      };
    } catch (err) {
      clearTimeout(timer);
      lastError =
        err.name === 'AbortError' ? `Timeout ${TIMEOUT_MS}ms` : err.message;
      if (attempt < MAX_RETRIES) {
        await sleep(500 * (attempt + 1));
        continue;
      }
    }
  }
  return { success: false, error: lastError || 'Unknown error', host: 'catbox' };
}

async function uploadToX0({ file, filename }) {
  const form = new FormData();
  form.append('file', file, filename || 'upload.bin');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(X0_ENDPOINT, {
      method: 'POST',
      headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] },
      body: form,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = (await res.text()).trim();

    if (res.ok && /^https?:\/\/x0\.at\//.test(text)) {
      return { success: true, url: text, host: 'x0.at' };
    }
    return {
      success: false,
      error: text || `x0.at HTTP ${res.status}`,
      host: 'x0.at',
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      success: false,
      error: err.name === 'AbortError' ? `Timeout ${TIMEOUT_MS}ms` : err.message,
      host: 'x0.at',
    };
  }
}

async function uploadAuto({ file, filename }) {
  const catbox = await uploadToCatbox({ file, filename });
  if (catbox.success) return catbox;

  const shouldFallback =
    catbox.fallback ||
    /invalid uploader|too many uploads|paused/i.test(catbox.error || '');

  if (!shouldFallback) return catbox;

  const x0 = await uploadToX0({ file, filename });
  if (x0.success) {
    return {
      success: true,
      url: x0.url,
      host: 'x0.at (catbox fallback)',
      catbox_error: catbox.error,
    };
  }

  return {
    success: false,
    error: `Catbox: ${catbox.error} | x0.at: ${x0.error}`,
    host: 'both-failed',
  };
}

async function uploadFromUrl({ url }) {
  if (!url) throw new Error('url wajib diisi');
  const form = new FormData();
  form.append('reqtype', 'urlupload');
  form.append('url', url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(CATBOX_ENDPOINT, {
      method: 'POST',
      headers: BROWSER_HEADERS,
      body: form,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = (await res.text()).trim();
    if (res.ok && /^https?:\/\/files\.catbox\.moe\//.test(text)) {
      return { success: true, url: text, host: 'catbox' };
    }
    return {
      success: false,
      error: text || `Catbox HTTP ${res.status}`,
      host: 'catbox',
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      success: false,
      error: err.name === 'AbortError' ? `Timeout ${TIMEOUT_MS}ms` : err.message,
      host: 'catbox',
    };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { uploadAuto, uploadFromUrl, uploadToCatbox, uploadToX0 };
