'use client';

import { useState } from 'react';
import type { IntegrationCheck } from '@/lib/integration-checks';
import type { searchConsoleReport } from '@/lib/search-console';

export function IntegrationControls() {
  const [checks, setChecks] = useState<IntegrationCheck[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [google, setGoogle] = useState<Awaited<ReturnType<typeof searchConsoleReport>> | null>(null);
  async function run(action: 'check' | 'email-test' | 'google-status' | 'google-submit') {
    setBusy(true); setMessage('');
    try {
      const googleAction = action.startsWith('google-');
      const response = await fetch(`/api/admin/integrations/${googleAction ? 'search-console' : action}`, {
        method: 'POST', ...(googleAction ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: action === 'google-submit' ? 'submit_sitemap' : 'status' }) } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Tekshiruv bajarilmadi.');
      if (data.checks) setChecks(data.checks);
      if (data.report) setGoogle(data.report);
      setMessage(data.message || 'Tekshiruv yakunlandi. Har bir xizmat natijasini ko‘ring.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Tekshiruv bajarilmadi.'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4" aria-labelledby="integration-live-checks">
    <h2 id="integration-live-checks" className="text-xl font-bold text-navy-900">Ulanishni amalda tekshirish</h2>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={() => run('check')} className="rounded-lg bg-teal-800 text-white px-4 py-2 disabled:opacity-50">{busy ? 'Bajarilmoqda…' : 'Xizmatlarni tekshirish'}</button>
      <button type="button" disabled={busy} onClick={() => run('email-test')} className="rounded-lg border border-teal-800 text-teal-900 px-4 py-2 disabled:opacity-50">Email ulanishini sinash</button>
      <button type="button" disabled={busy} onClick={() => run('google-status')} className="rounded-lg border border-teal-800 text-teal-900 px-4 py-2 disabled:opacity-50">Google indeks holatini tekshirish</button>
      <button type="button" disabled={busy} onClick={() => run('google-submit')} className="rounded-lg border border-teal-800 text-teal-900 px-4 py-2 disabled:opacity-50">Sitemap’ni Google’ga yuborish</button>
      <a href="/api/admin/archive" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-4 py-2 text-navy-900 underline">PDF va metama’lumotlar ZIP arxivi</a>
    </div>
    <p className="text-sm text-slate-600">Gmail sinovi jurnalning jo‘natuvchi manziliga, Resend sinovi delivered@resend.dev manziliga yuboriladi. Depozit amallari standart holatda test/sandbox rejimida ishlaydi.</p>
    <p role="status" className="text-sm text-slate-700">{message}</p>
    {google && <div className="space-y-2 text-sm"><p>Google mulki: {google.property}</p><p>Sitemap: {google.sitemap ? `${google.sitemap.pending ? 'kutilmoqda' : 'qayta ishlangan'}, xatolar: ${google.sitemap.errors}` : 'Google hisobida topilmadi'}</p><ul>{google.pages.map(page => <li key={page.url} className="border-t py-2"><a href={page.url} className="underline">{page.url}</a><p>{page.verdict} — {page.coverageState}</p>{page.lastCrawlTime && <p>Oxirgi crawl: {page.lastCrawlTime}</p>}</li>)}</ul></div>}
    <ul className="space-y-3">{checks.map(check => <li key={check.service} className="border-t border-slate-100 pt-3 text-sm"><strong>{check.service}: </strong>
      <span className={check.status === 'ok' ? 'text-emerald-800' : check.status === 'ready' ? 'text-slate-700' : 'text-amber-900'}>{check.status === 'ok' ? 'Tekshirildi' : check.status === 'ready' ? 'Sozlangan, oqim sinovi kerak' : check.status === 'missing' ? 'Sozlash kerak' : 'Xato'}</span><p className="mt-1 text-slate-600">{check.detail}</p></li>)}</ul>
  </section>;
}

export function DepositActions({ articleId, crossref, zenodo, crossrefMode, zenodoMode }: { articleId: string; crossref: boolean; zenodo: boolean; crossrefMode: string; zenodoMode: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [crossrefJobId, setCrossrefJobId] = useState('');
  async function deposit(provider: 'crossref' | 'zenodo') {
    setBusy(true); setMessage(''); setUrl(null);
    try {
      const response = await fetch(`/api/admin/articles/${articleId}/deposit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Depozit bajarilmadi.');
      if (provider === 'crossref') setCrossrefJobId(data.job.id);
      setMessage(`${data.job.status}: ${data.job.message}${data.job.remote_id ? ` ID: ${data.job.remote_id}` : ''}`);
      if (data.job.remote_url && /^https:\/\/(sandbox\.)?zenodo\.org\/deposit\/\d+$/.test(data.job.remote_url)) setUrl(data.job.remote_url);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Depozit bajarilmadi.'); }
    finally { setBusy(false); }
  }
  async function checkCrossrefStatus() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/articles/${articleId}/deposit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'crossref', action: 'check_status', job_id: crossrefJobId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Hisobot olinmadi.');
      setMessage(data.job.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Hisobot olinmadi.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2 pt-2">
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy || !crossref} onClick={() => deposit('crossref')} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Crossrefga yuborish ({crossrefMode})</button>
      {crossrefJobId && <button type="button" disabled={busy} onClick={checkCrossrefStatus} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Crossref yakuniy hisobotini tekshirish</button>}
      <button type="button" disabled={busy || !zenodo} onClick={() => deposit('zenodo')} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Zenodo qoralamasi ({zenodoMode})</button>
    </div>
    {(!crossref || !zenodo) && <p className="text-xs text-slate-600">Kalitlari sozlanmagan xizmat tugmasi faol emas.</p>}
    <p role="status" className="text-sm text-slate-700">{busy ? 'Tashqi xizmat javobi kutilmoqda…' : message}</p>
    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-teal-800 underline">Zenodo qoralamasini tekshirish</a>}
  </div>;
}
