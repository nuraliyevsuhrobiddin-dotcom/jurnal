import { createServerClient } from './supabase/server';
import { configured, crossrefConfig, zenodoConfig, orcidConfig } from './integration-config';
import { mailConfigured, mailProvider } from './notifications';
import { gmailAccessToken } from './gmail';

export interface IntegrationCheck { service: string; status: 'ok' | 'missing' | 'error' | 'ready'; detail: string }

export async function checkIntegrations(): Promise<IntegrationCheck[]> {
  const checks: Promise<IntegrationCheck>[] = [
    (async () => {
      try {
        const client = createServerClient();
        if (!client) return { service: 'Supabase', status: 'missing', detail: 'Lokal saqlash rejimi.' } as IntegrationCheck;
        const [database, notifications, storage] = await Promise.all([
          client.from('articles').select('id', { head: true, count: 'exact' }),
          client.from('notification_outbox').select('id', { head: true }),
          client.storage.listBuckets(),
        ]);
        const expected = ['journal-pdfs', 'journal-manuscripts', 'journal-covers'];
        const missing = expected.filter(name => !storage.data?.some(bucket => bucket.name === name));
        if (database.error || notifications.error || storage.error || missing.length) throw new Error();
        return { service: 'Supabase', status: 'ok', detail: 'Maqola bazasi, email navbati va uchta fayl ombori javob berdi.' } as IntegrationCheck;
      } catch { return { service: 'Supabase', status: 'error', detail: 'Baza yoki fayl omborini tekshirib bo‘lmadi.' } as IntegrationCheck; }
    })(),
    (async () => {
      if (mailProvider() === 'gmail') {
        if (!mailConfigured()) return { service: 'Gmail', status: 'missing', detail: 'GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN va GMAIL_SENDER kerak.' } as IntegrationCheck;
        try {
          await gmailAccessToken();
          return { service: 'Gmail', status: 'ready', detail: 'OAuth token olindi. Jo‘natuvchi va yuborish huquqini sinov xati bilan tekshiring.' } as IntegrationCheck;
        } catch { return { service: 'Gmail', status: 'error', detail: 'Google OAuth ulanishini tekshiring.' } as IntegrationCheck; }
      }
      if (!mailConfigured()) return { service: 'Resend', status: 'missing', detail: 'RESEND_API_KEY va MAIL_FROM kerak.' } as IntegrationCheck;
      try {
        const response = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(10000), redirect: 'error' });
        if (response.status === 403) return { service: 'Resend', status: 'ready', detail: 'Kalitlar sozlangan; cheklangan API kaliti domenlarni o‘qiy olmaydi. Sinov xati bilan tekshiring.' } as IntegrationCheck;
        if (!response.ok) throw new Error();
        const payload = await response.json();
        const sender = process.env.MAIL_FROM!.match(/<?([^\s<>@]+@[^\s<>]+)>?$/)?.[1];
        const domain = sender?.split('@')[1].toLowerCase();
        const verified = payload.data?.some((item: { name: string; status: string }) => item.name.toLowerCase() === domain && item.status === 'verified');
        return { service: 'Resend', status: verified ? 'ok' : 'error', detail: verified ? 'API kaliti va jo‘natuvchi domeni tasdiqlandi.' : 'MAIL_FROM domeni tasdiqlangan domenlarga mos emas.' } as IntegrationCheck;
      } catch { return { service: 'Resend', status: 'error', detail: 'Email provayderiga ulanish tekshirilmadi.' } as IntegrationCheck; }
    })(),
    (async () => {
      if (!configured(zenodoConfig)) return { service: 'Zenodo', status: 'missing', detail: 'ZENODO_ACCESS_TOKEN kerak; standart rejim sandbox.' } as IntegrationCheck;
      try {
        const config = zenodoConfig();
        const response = await fetch(`${config.base}/api/deposit/depositions?size=1`, { headers: { Authorization: `Bearer ${config.token}` }, redirect: 'error', signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error();
        await response.body?.cancel();
        return { service: 'Zenodo', status: 'ok', detail: `${config.environment}: hisob javob berdi; hech narsa yuklanmadi.` } as IntegrationCheck;
      } catch { return { service: 'Zenodo', status: 'error', detail: 'Token yoki repozitoriyga ulanishni tekshiring.' } as IntegrationCheck; }
    })(),
  ];
  const result = await Promise.all(checks);
  result.push({ service: 'Crossref', status: configured(crossrefConfig) ? 'ready' : 'missing', detail: configured(crossrefConfig) ? `${crossrefConfig().environment}: sozlangan; hisob vakolati depozit javobida tekshiriladi.` : 'CROSSREF_USERNAME va CROSSREF_PASSWORD kerak. Test hisobi Crossref orqali alohida ochiladi.' });
  result.push({ service: 'ORCID', status: configured(orcidConfig) ? 'ready' : 'missing', detail: configured(orcidConfig) ? `${orcidConfig().environment}: OAuth tayyor; muallifning rozilik oqimi bilan tekshiriladi.` : 'ORCID_CLIENT_ID va ORCID_CLIENT_SECRET kerak; standart rejim sandbox.' });
  result.push({ service: 'Antiplagiat / uzoq muddatli arxiv', status: 'missing', detail: 'Xizmat shartnomasi va provayder API ruxsati kerak. ZIP eksport arxivga topshirish uchun mavjud.' });
  return result;
}
