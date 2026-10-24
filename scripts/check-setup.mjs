import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

// Use exactly the same precedence and $ expansion as Next.js. Never print secrets.
nextEnv.loadEnvConfig(process.cwd());
const online = process.argv.includes('--online');
let failures = 0;
const report = (state, name, detail) => {
  console.log(`[${state}] ${name}: ${detail}`);
  if (state === 'ERROR') failures++;
};
const value = name => process.env[name]?.trim() || '';
const present = name => Boolean(value(name)) && !/placeholder|your[-_]|changeme/i.test(value(name));
function required(name) {
  const ok = present(name);
  report(ok ? 'OK' : 'ERROR', name, ok ? 'sozlangan (qiymat yashirildi)' : 'haqiqiy qiymat kerak; docs/setup-uz.md');
  return ok;
}
function validUrl(name) {
  try {
    const url = new URL(value(name));
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !present(name)) throw new Error();
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error();
    report('OK', name, 'URL formati to‘g‘ri');
    return true;
  } catch {
    report('ERROR', name, 'HTTPS URL kerak (localhost uchun HTTP mumkin)');
    return false;
  }
}

function checkKey(name, role, prefix) {
  const key = value(name);
  if (!present(name)) return;
  let ok = key.startsWith(prefix);
  if (key.startsWith('eyJ')) {
    try {
      const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
      ok = claims.role === role && (!claims.exp || claims.exp * 1000 > Date.now());
      if (claims.ref && databaseUrl) {
        const hostname = new URL(value('NEXT_PUBLIC_SUPABASE_URL')).hostname;
        if (hostname.endsWith('.supabase.co')) ok &&= hostname === `${claims.ref}.supabase.co`;
      }
    } catch { ok = false; }
  }
  report(ok ? 'OK' : 'ERROR', `${name}/format`, ok ? 'kalit turi mos; haqiqiy vakolat tarmoqda tekshiriladi' : 'kalit turi, loyiha yoki amal qilish muddati mos emas');
}

console.log('AGM Journal — sozlamalar tekshiruvi');
validUrl('NEXT_PUBLIC_SITE_URL');
required('ADMIN_PASSWORD');
required('CRON_SECRET');
if (!present('TRACKING_SECRET')) report('INFO', 'TRACKING_SECRET', 'ADMIN_PASSWORD ishlatiladi; parol almashsa eski kuzatish havolalari bekor bo‘ladi');
const databaseUrl = validUrl('NEXT_PUBLIC_SUPABASE_URL');
const serverKey = required('SUPABASE_SERVICE_ROLE_KEY');
required('NEXT_PUBLIC_SUPABASE_ANON_KEY');
checkKey('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon', 'sb_publishable_');
checkKey('SUPABASE_SERVICE_ROLE_KEY', 'service_role', 'sb_secret_');
const provider = value('MAIL_PROVIDER') || 'resend';
if (!['gmail', 'resend'].includes(provider)) report('ERROR', 'MAIL_PROVIDER', 'gmail yoki resend bo‘lishi kerak');
const mailNames = provider === 'gmail'
  ? ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'GMAIL_SENDER']
  : ['RESEND_API_KEY', 'MAIL_FROM'];
const emailReady = mailNames.map(required).every(Boolean);
for (const [name, keys] of [
  ['ORCID', ['ORCID_CLIENT_ID', 'ORCID_CLIENT_SECRET']],
  ['Zenodo', ['ZENODO_ACCESS_TOKEN']],
  ['Crossref', ['CROSSREF_USERNAME', 'CROSSREF_PASSWORD']],
]) {
  const count = keys.filter(present).length;
  report(count === keys.length ? 'INFO' : count ? 'ERROR' : 'OPTIONAL', name,
    count === keys.length ? 'kalitlar mavjud; bu hisob vakolatini tasdiqlamaydi' : `kerak: ${keys.join(', ')}; docs/setup-uz.md`);
}

if (online) {
  const safeFetch = (url, init) => fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (databaseUrl && present('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
    try {
      const response = await safeFetch(`${value('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')}/auth/v1/settings`, {
        headers: { apikey: value('NEXT_PUBLIC_SUPABASE_ANON_KEY') },
      });
      report(response.ok ? 'OK' : 'ERROR', 'Supabase/public key', response.ok ? 'Auth xizmati kalitni qabul qildi' : `kalit qabul qilinmadi (HTTP ${response.status})`);
      await response.body?.cancel();
    } catch { report('ERROR', 'Supabase/public key', 'Auth xizmatiga ulanib bo‘lmadi'); }
  }
  if (databaseUrl && serverKey) {
    const client = createClient(value('NEXT_PUBLIC_SUPABASE_URL'), value('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: safeFetch },
    });
    const tables = ['profiles', 'issues', 'articles', 'article_authors', 'article_files', 'editorial_board',
      'certificates', 'journal_settings', 'audit_logs', 'contact_messages', 'notification_outbox',
      'integration_jobs', 'editorial_messages', 'staff_accounts', 'staff_security', 'review_assignments', 'backup_runs'];
    await Promise.all(tables.map(async table => {
      try {
        const { error } = await client.from(table).select('*', { head: true });
        report(error ? 'ERROR' : 'OK', `DB/${table}`, error ? `ulanish yoki sxema xatosi (${error.code || 'network'}); migratsiyalar 001–014 ni tekshiring` : 'o‘qish huquqi tasdiqlandi');
      } catch { report('ERROR', `DB/${table}`, 'tarmoqqa ulanib bo‘lmadi'); }
    }));
    try {
      const { data, error } = await client.storage.listBuckets();
      if (error) throw new Error();
      for (const [name, publicAccess] of [['journal-pdfs', false], ['journal-manuscripts', false], ['journal-covers', true], ['journal-backups', false]]) {
        const bucket = data.find(item => item.name === name);
        report(bucket && bucket.public === publicAccess ? 'OK' : 'ERROR', `Storage/${name}`,
          !bucket ? 'bucket yo‘q; migratsiyalarni bajaring' : bucket.public !== publicAccess ? 'bucket maxfiylik sozlamasi noto‘g‘ri' : 'bucket va maxfiylik sozlamasi to‘g‘ri');
      }
    } catch { report('ERROR', 'Storage', 'bucketlarni tekshirib bo‘lmadi'); }
    const { data, error } = await client.from('journal_settings').select('key').eq('key', 'general').maybeSingle();
    report(!error && data ? 'OK' : 'ERROR', 'Jurnal sozlamalari', !error && data ? 'general yozuvi mavjud' : 'general yozuvi yo‘q yoki o‘qilmadi; mavjud bazaga demo seedni qayta yuklamang');
  }
  if (emailReady && provider === 'gmail') {
    try {
      const response = await safeFetch('https://oauth2.googleapis.com/token', {
        method: 'POST', body: new URLSearchParams({ client_id: value('GMAIL_CLIENT_ID'), client_secret: value('GMAIL_CLIENT_SECRET'), refresh_token: value('GMAIL_REFRESH_TOKEN'), grant_type: 'refresh_token' }),
      });
      const payload = await response.json();
      report(response.ok && payload.access_token ? 'OK' : 'ERROR', 'Gmail OAuth', response.ok && payload.access_token ? 'token olindi; xat jo‘natilmadi' : `OAuth rad etildi (HTTP ${response.status}); npm run connect:gmail`);
    } catch { report('ERROR', 'Gmail OAuth', 'Google xizmatiga ulanib bo‘lmadi'); }
  }
} else {
  report('INFO', 'Tarmoq', 'haqiqiy bazani tekshirish: npm run check:setup -- --online');
}
console.log(`\nNatija: ${failures} ta xato. Maxfiy qiymatlar chiqarilmadi.`);
process.exitCode = failures ? 1 : 0;
