import http from 'node:http';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

// Run locally with `node scripts/connect-gmail.mjs`. No secrets are printed.
const root = process.cwd();
const envPath = path.join(root, '.env.local');
const credentials = JSON.parse(await readFile(path.join(root, '.data/gmail-client.json'), 'utf8')).web;
if (!credentials?.client_id || !credentials?.client_secret) throw new Error('Web OAuth client fayli kerak.');
const redirectUri = 'http://localhost:53682/oauth2callback';
const state = randomBytes(32).toString('base64url');
const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
let exchanging = false;
let completed = false;

function page(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
  });
  response.end(`<!doctype html><html lang="uz"><meta charset="utf-8"><title>AGM Journal Gmail</title><style>body{font:18px system-ui;max-width:720px;margin:80px auto;padding:20px;line-height:1.7}a{color:#087f75}</style>${body}</html>`);
}

async function saveSettings(token) {
  let contents = await readFile(envPath, 'utf8');
  for (const [key, value] of Object.entries({
    MAIL_PROVIDER: 'gmail', GMAIL_CLIENT_ID: credentials.client_id,
    GMAIL_CLIENT_SECRET: credentials.client_secret, GMAIL_REFRESH_TOKEN: token,
    GMAIL_SENDER: 'agmjoural.editorial@gmail.com',
  })) {
    if (typeof value !== 'string' || /[\r\n]/.test(value)) throw new Error('Invalid setting');
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    contents = pattern.test(contents) ? contents.replace(pattern, () => `${key}=${value}`) : `${contents.trimEnd()}\n${key}=${value}\n`;
  }
  const temporary = `${envPath}.${randomBytes(8).toString('hex')}.tmp`;
  await writeFile(temporary, contents, { mode: 0o600 });
  await rename(temporary, envPath);
}

const server = http.createServer(async (request, response) => {
  try {
    if (!['localhost:53682', '127.0.0.1:53682'].includes(request.headers.host)) return page(response, 403, '<p>Invalid host.</p>');
    if (request.method !== 'GET') return page(response, 405, '<p>Method not allowed.</p>');
    const url = new URL(request.url, 'http://localhost:53682');
    if (url.pathname === '/') return page(response, 200, '<h1>AGM Journal Gmail ulanishi</h1><p>Google Cloud OAuth client sozlamasidagi <b>Authorized redirect URIs</b> ro‘yxatiga quyidagini qo‘shing:</p><pre>http://localhost:53682/oauth2callback</pre><p>Testing rejimida <b>Audience → Test users</b> bo‘limiga <b>agmjoural.editorial@gmail.com</b> ni qo‘shing.</p><p>So‘ng <a href="/start">Google hisobini ulash</a> havolasini bosing va jurnal hisobini tanlang.</p>');
    if (url.pathname === '/start') {
      if (completed || exchanging) return page(response, 409, '<p>Ulanish allaqachon bajarilmoqda yoki tugagan.</p>');
      const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authorization.search = new URLSearchParams({
        client_id: credentials.client_id, redirect_uri: redirectUri, response_type: 'code',
        scope: 'https://www.googleapis.com/auth/gmail.send', access_type: 'offline',
        prompt: 'consent', login_hint: 'agmjoural.editorial@gmail.com', state,
        code_challenge: challenge, code_challenge_method: 'S256',
      }).toString();
      response.writeHead(302, { Location: authorization.toString(), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
      return response.end();
    }
    if (url.pathname !== '/oauth2callback') return page(response, 404, '<p>Not found.</p>');
    const received = Buffer.from(url.searchParams.get('state') || '');
    const expected = Buffer.from(state);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return page(response, 400, '<p>Ulanish sessiyasi mos emas. Bosh sahifadan qayta boshlang.</p>');
    if (url.searchParams.has('error')) return page(response, 400, '<p>Google ruxsat bermadi. Google Cloud Audience va test foydalanuvchisini tekshiring.</p>');
    const code = url.searchParams.get('code');
    if (!code || exchanging || completed) return page(response, 409, '<p>Bu ulanish so‘rovi ishlatilgan yoki kod yetishmayapti.</p>');
    exchanging = true;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', signal: AbortSignal.timeout(15000), redirect: 'error',
      body: new URLSearchParams({ client_id: credentials.client_id, client_secret: credentials.client_secret, code, code_verifier: verifier, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    if (!tokenResponse.ok) throw new Error('Google token exchange failed');
    const payload = await tokenResponse.json();
    if (typeof payload.refresh_token !== 'string' || !payload.refresh_token) throw new Error('Refresh token missing');
    if (!String(payload.scope || '').split(' ').includes('https://www.googleapis.com/auth/gmail.send')) throw new Error('Gmail send permission missing');
    await saveSettings(payload.refresh_token);
    completed = true;
    page(response, 200, '<h1>Gmail ulandi</h1><p>Kalitlar .env.local fayliga saqlandi. Bu oynani yopishingiz mumkin.</p><p>Sayt ishlayotgan bo‘lsa, yangi email sozlamalari uchun uni qayta ishga tushiring.</p>');
    console.log('Gmail connected. Credentials saved to .env.local; no email was sent.');
    server.close();
    clearTimeout(expiry);
  } catch {
    exchanging = false;
    console.error('Gmail setup failed. No credentials or authorization codes were logged.');
    page(response, 502, '<p>Google ulanishini yakunlab bo‘lmadi. Bosh sahifadan qayta boshlang.</p>');
  }
});
server.on('error', () => { console.error('Local setup server could not start on port 53682.'); process.exitCode = 1; });
const expiry = setTimeout(() => { console.log('Gmail setup session expired. Run the script again to continue.'); server.close(); }, 30 * 60 * 1000);
expiry.unref();
server.listen(53682, '127.0.0.1', () => console.log('Gmail setup: http://localhost:53682 (expires in 30 minutes)'));
