/*
Scrape by xs0ciety505/xs0cietyHUB
t.me/xs0cietyHUB
wa.me/9779845668812
*/

const CATBOX_ENDPOINT = 'https://catbox.moe/user/api.php';
const TIMEOUT_MS = 30_000;

const USERHASH = process.env.CATBOX_USERHASH || '';

async function uploadToCatbox({ file, filename }) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  if (USERHASH) form.append('userhash', USERHASH);
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
      return { success: true, url: text, host: 'catbox' };
    }
    return { success: false, error: text || `Catbox HTTP ${res.status}`, host: 'catbox' };
  } catch (err) {
    clearTimeout(timer);
    return {
      success: false,
      error: err.name === 'AbortError' ? `Timeout ${TIMEOUT_MS}ms` : err.message,
      host: 'catbox',
    };
  }
}

async function uploadFromUrl({ url }) {
  const form = new FormData();
  form.append('reqtype', 'urlupload');
  if (USERHASH) form.append('userhash', USERHASH);
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
      return { success: true, url: text, host: 'catbox' };
    }
    return { success: false, error: text || `Catbox HTTP ${res.status}`, host: 'catbox' };
  } catch (err) {
    clearTimeout(timer);
    return {
      success: false,
      error: err.name === 'AbortError' ? `Timeout ${TIMEOUT_MS}ms` : err.message,
      host: 'catbox',
    };
  }
}

module.exports = { uploadToCatbox, uploadFromUrl };
