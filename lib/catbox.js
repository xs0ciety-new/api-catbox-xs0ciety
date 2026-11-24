/*
Scrape by xs0ciety505/xs0cietyHUB
t.me/xs0cietyHUB
wa.me/9779845668812
*/

const CATBOX_ENDPOINT = 'https://catbox.moe/user/api.php';
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

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
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const text = (await res.text()).trim();

      if (res.ok && /^https?:\/\/files\.catbox\.moe\//.test(text)) {
        return { success: true, url: text };
      }
      if (res.status >= 500 && attempt < MAX_RETRIES) {
        lastError = `Catbox HTTP ${res.status}: ${text.slice(0, 200)}`;
        await sleep(500 * (attempt + 1));
        continue;
      }
      return { success: false, error: text || `Catbox HTTP ${res.status}` };
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
  return { success: false, error: lastError || 'Unknown error' };
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
      body: form,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = (await res.text()).trim();
    if (res.ok && /^https?:\/\/files\.catbox\.moe\//.test(text)) {
      return { success: true, url: text };
    }
    return { success: false, error: text || `Catbox HTTP ${res.status}` };
  } catch (err) {
    clearTimeout(timer);
    return {
      success: false,
      error: err.name === 'AbortError' ? `Timeout ${TIMEOUT_MS}ms` : err.message,
    };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { uploadToCatbox, uploadFromUrl };
