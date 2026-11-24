/*
Scrape by xs0ciety505/xs0cietyHUB
t.me/xs0cietyHUB
wa.me/9779845668812
*/

const formidable = require('formidable');
const fs = require('fs/promises');
const { uploadToCatbox, uploadFromUrl } = require('../lib/catbox');
const {
  applyCors,
  verifyRequest,
  isExtensionAllowed,
  rateLimit,
} = require('../lib/security');

const config = { api: { bodyParser: false } };

async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Gunakan POST.' });
  }

  const authFail = verifyRequest(req);
  if (authFail) return res.status(authFail.status).json(authFail.body);

  const rlFail = rateLimit(req);
  if (rlFail) return res.status(rlFail.status).json(rlFail.body);

  const contentType = req.headers['content-type'] || '';

  try {
    // ── Mode A: multipart upload ──
    if (contentType.includes('multipart/form-data')) {
      const form = formidable({
        maxFileSize: 200 * 1024 * 1024,
        multiples: false,
      });

      const [, files] = await form.parse(req);
      const uploaded = Array.isArray(files.file)
        ? files.file[0]
        : files.file || files.fileToUpload;

      if (!uploaded) {
        return res.status(400).json({
          success: false,
          error: 'Field file wajib: name="file".',
        });
      }
      if (!isExtensionAllowed(uploaded.originalFilename)) {
        return res.status(400).json({
          success: false,
          error: `Tipe file tidak diizinkan: ${uploaded.originalFilename}`,
        });
      }

      const buffer = await fs.readFile(uploaded.filepath);
      await fs.unlink(uploaded.filepath).catch(() => {});

      const blob = new Blob([buffer], {
        type: uploaded.mimetype || 'application/octet-stream',
      });

      const result = await uploadToCatbox({
        file: blob,
        filename: uploaded.originalFilename || 'upload.bin',
        userhash: process.env.CATBOX_USERHASH,
      });

      return res.status(result.success ? 200 : 502).json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    }

    // ── Mode B: JSON url upload ──
    if (contentType.includes('application/json')) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');

      if (!body.url || !/^https?:\/\//i.test(body.url)) {
        return res.status(400).json({
          success: false,
          error: 'Body JSON: { "url": "https://..." }',
        });
      }

      const ext = body.url.split('?')[0].split('.').pop();
      if (!isExtensionAllowed(ext)) {
        return res.status(400).json({
          success: false,
          error: `Ekstensi URL tidak diizinkan: .${ext}`,
        });
      }

      const result = await uploadFromUrl({
        url: body.url,
        userhash: process.env.CATBOX_USERHASH,
      });

      return res.status(result.success ? 200 : 502).json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(415).json({
      success: false,
      error: 'Content-Type harus multipart/form-data atau application/json.',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = handler;
module.exports.config = config;
