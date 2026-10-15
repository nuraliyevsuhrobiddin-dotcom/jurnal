'use client';
import { useEffect, useState } from 'react';
import type { Article } from '@/types/journal';

export function PdfUpload() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState('');
  useEffect(() => {
    fetch('/api/admin/articles').then(async response => {
      if (!response.ok) throw new Error('Maqolalarni yuklab bo‘lmadi.');
      setArticles(await response.json());
    }).catch(cause => setStatus(cause.message));
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = String(data.get('article_id'));
    data.delete('article_id');
    setBusy(true); setStatus(''); setPreview('');
    try {
      const response = await fetch(`/api/admin/articles/${encodeURIComponent(id)}/pdf`, { method: 'POST', body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setStatus('Maqola jurnal maketida tayyorlandi va PDF fayli saqlandi.');
      setPreview(result.url);
    } catch (cause) { setStatus(cause instanceof Error ? cause.message : 'PDF saqlanmadi.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    <div><label htmlFor="pdf-article" className="block font-semibold text-sm mb-2">Maqolani tanlang</label>
      <select id="pdf-article" name="article_id" required defaultValue="" className="w-full rounded-lg border border-slate-300 p-3"><option value="" disabled>Maqola…</option>{articles.map(article => <option key={article.id} value={article.id}>{article.title_uz}</option>)}</select></div>
    <div><label htmlFor="pdf-file" className="block font-semibold text-sm mb-2">Maqolaning to‘liq PDF fayli (20 MB gacha)</label><input id="pdf-file" name="file" type="file" accept="application/pdf,.pdf" required className="w-full text-sm" /></div>
    <p className="text-sm text-slate-600">Jurnal titul sahifasi, sahifa raqamlari va nashr rekvizitlari qo‘shiladi. Yuklangan fayldagi matn, formulalar va jadvallar saqlanadi. Oldin saqlangan PDF’ni yangi maketga o‘tkazish uchun asl faylini qayta yuklang.</p>
    <button disabled={busy || !articles.length} className="px-5 py-3 bg-navy-900 text-white rounded-lg font-semibold disabled:opacity-50">{busy ? 'Tayyorlanmoqda…' : 'PDF tayyorlash va saqlash'}</button>
    <p role="status" className="text-sm text-slate-700">{status}</p>
    {preview && <a href={preview} target="_blank" rel="noopener noreferrer" className="inline-block text-teal-800 underline">PDF faylini ko‘rish</a>}
  </form>;
}
