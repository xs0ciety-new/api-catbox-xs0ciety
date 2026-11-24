/*
Scrape by xs0ciety505/xs0cietyHUB
t.me/xs0cietyHUB
wa.me/9779845668812
*/

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const cors = {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token',
      'Access-Control-Max-Age': '86400',
    };
    if (allowed.includes(origin)) {
      cors['Access-Control-Allow-Origin'] = origin;
      cors['Vary'] = 'Origin';
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return json({ success: false, error: 'Gunakan POST.' }, 405, cors);
    }

    // 1) Origin lock
    if (!allowed.includes(origin)) {
      return json(
        { success: false, error: 'Origin tidak diizinkan.' },
        403,
        cors
      );
    }

    // 2) Turnstile (opsional — aktif jika TURNSTILE_SECRET diset)
    if (env.TURNSTILE_SECRET) {
      const token = request.headers.get('X-Turnstile-Token');
      if (!token) {
        return json(
          { success: false, error: 'Turnstile token diperlukan.' },
          400,
          cors
        );
      }

      const verify = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          body: new URLSearchParams({
            secret: env.TURNSTILE_SECRET,
            response: token,
            remoteip: request.headers.get('CF-Connecting-IP') || '',
          }),
        }
      );
      const result = await verify.json();
      if (!result.success) {
        return json(
          { success: false, error: 'Verifikasi Turnstile gagal.' },
          403,
          cors
        );
      }
    }

    // 3) Forward ke Vercel dengan internal secret
    const body = await request.arrayBuffer();
    const upstream = await fetch(env.VERCEL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('Content-Type') || '',
        'X-Internal-Secret': env.INTERNAL_SECRET,
        'X-Client-IP': request.headers.get('CF-Connecting-IP') || '',
      },
      body,
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  },
};

function json(obj, status, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}
