'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Issue } from '@/types/journal';
import { Pencil, PlusCircle, X, Trash2 } from 'lucide-react';
import { IssueCoverImage } from '@/components/issues/IssueCoverImage';
import { IssueDownloadLink } from '@/components/issues/IssueDownloadLink';

type IssueForm = {
  volume: string; issue_number: string; year: string;
  title_uz: string; title_en: string; title_ru: string;
  description_uz: string; description_en: string; description_ru: string;
  publication_date: string; is_current: boolean; cover_image_url: string;
};

const DEFAULT_COVER = '/images/issue-cover-default.svg';
const blankForm = (): IssueForm => ({
  volume: '1', issue_number: '1', year: String(new Date().getFullYear()),
  title_uz: '', title_en: '', title_ru: '', description_uz: '', description_en: '', description_ru: '',
  publication_date: new Date().toISOString().slice(0, 10), is_current: false, cover_image_url: DEFAULT_COVER,
});
const fieldClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20';
const labelClass = 'block text-xs font-semibold text-slate-700';

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [form, setForm] = useState<IssueForm>(blankForm);
  const [selectedCover, setSelectedCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/issues');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Jurnal sonlarini yuklab bo‘lmadi.');
      setIssues(Array.isArray(body) ? body : []);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Jurnal sonlarini yuklab bo‘lmadi.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadIssues); }, [loadIssues]);

  function createIssue() {
    const nextIssue = Math.max(0, ...issues.filter(issue => issue.volume === 1).map(issue => issue.issue_number)) + 1;
    setEditing(null);
    setForm({ ...blankForm(), issue_number: String(nextIssue) });
    setSelectedCover(null); setCoverPreview('');
    setIsOpen(true);
    setError(''); setNotice('');
  }

  function editIssue(issue: Issue) {
    setEditing(issue);
    setSelectedCover(null); setCoverPreview('');
    setForm({
      volume: String(issue.volume), issue_number: String(issue.issue_number), year: String(issue.year),
      title_uz: issue.title_uz || '', title_en: issue.title_en || '', title_ru: issue.title_ru || '',
      description_uz: issue.description_uz || '', description_en: issue.description_en || '', description_ru: issue.description_ru || '',
      publication_date: issue.publication_date, is_current: issue.is_current,
      cover_image_url: issue.cover_image_url && !/^\/images\/issue-\d+-cover\.png$/i.test(issue.cover_image_url) ? issue.cover_image_url : DEFAULT_COVER,
    });
    setIsOpen(true);
    setError(''); setNotice('');
  }

  async function deleteIssueHandler(issue: Issue) {
    if (!window.confirm(`Vol. ${issue.volume}, No. ${issue.issue_number} (${issue.year}) sonini butunlay o‘chirmoqchimisiz?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/issues/${issue.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'O‘chirib bo‘lmadi.');
      }
      setNotice(`Vol. ${issue.volume}, No. ${issue.issue_number} soni o‘chirildi.`);
      await loadIssues();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'O‘chirishda xatolik.');
    } finally {
      setSaving(false);
    }
  }

  async function saveIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      let coverImageUrl = form.cover_image_url.trim() || DEFAULT_COVER;
      if (selectedCover) {
        setUploadingCover(true);
        const uploadData = new FormData();
        uploadData.set('cover', selectedCover);
        const uploadResponse = await fetch('/api/admin/issues/cover', { method: 'POST', body: uploadData });
        const uploadBody = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadBody.error || 'Muqova rasmini yuklab bo‘lmadi.');
        coverImageUrl = uploadBody.url;
      }

      const payload = {
        ...form,
        volume: Number(form.volume), issue_number: Number(form.issue_number), year: Number(form.year),
        title_uz: form.title_uz.trim() || `${form.volume}-Jild, ${form.issue_number}-Son (${form.year})`,
        title_en: form.title_en.trim() || undefined, title_ru: form.title_ru.trim() || undefined,
        description_uz: form.description_uz.trim() || undefined,
        description_en: form.description_en.trim() || undefined, description_ru: form.description_ru.trim() || undefined,
        cover_image_url: coverImageUrl,
      };
      const response = await fetch(editing ? `/api/admin/issues/${editing.id}` : '/api/admin/issues', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        const fieldErrors = body.details?.fieldErrors;
        throw new Error((fieldErrors && Object.values(fieldErrors).flat()[0]) || body.error || 'Jurnal sonini saqlab bo‘lmadi.');
      }
      setEditing(null);
      setIsOpen(false);
      setNotice(editing ? 'Jurnal soni yangilandi.' : 'Yangi jurnal soni yaratildi.');
      await loadIssues();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Jurnal sonini saqlab bo‘lmadi.');
    } finally { setUploadingCover(false); setSaving(false); }
  }

  const titleFor = (issue: Issue) => issue.title_uz || `${issue.volume}-Jild, ${issue.issue_number}-Son (${issue.year})`;

  return <div className="space-y-6">
    {error && !editing && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div><h1 className="text-2xl font-extrabold text-navy-900">Jurnal sonlarini boshqarish</h1><p className="mt-1 text-sm text-slate-600">Jildlar, sonlar va ularning muqovalarini boshqaring.</p></div>
      <button type="button" onClick={createIssue} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800"><PlusCircle size={17}/>Yangi son yaratish</button>
    </header>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? <p className="p-10 text-center text-sm text-slate-600">Sonlar yuklanmoqda…</p> : issues.length === 0 ? <p className="p-10 text-center text-sm text-slate-600">Hozircha jurnal sonlari yo‘q.</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm text-slate-700">
          <thead className="bg-navy-900 text-[11px] uppercase tracking-wide text-white"><tr><th className="px-4 py-3">Jild / son / yil</th><th className="px-4 py-3">Muqova</th><th className="px-4 py-3">Sarlavha</th><th className="px-4 py-3">Nashr sanasi</th><th className="px-4 py-3">Holati</th><th className="px-4 py-3">Amal</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{issues.map(issue => <tr key={issue.id} className="hover:bg-slate-50">
            <td className="whitespace-nowrap px-4 py-3 font-bold text-navy-900">Vol. {issue.volume}, No. {issue.issue_number} ({issue.year})</td>
            <td className="px-4 py-3"><div className="relative h-16 w-12 overflow-hidden rounded border border-slate-200 bg-navy-900"><IssueCoverImage src={issue.cover_image_url || DEFAULT_COVER} alt={`${titleFor(issue)} muqovasi`} className="object-cover"/></div></td>
            <td className="max-w-xs px-4 py-3"><p className="font-semibold text-slate-800">{titleFor(issue)}</p><p className="line-clamp-1 text-xs text-slate-500">{issue.description_uz}</p></td>
            <td className="whitespace-nowrap px-4 py-3 text-xs">{issue.publication_date}</td>
            <td className="px-4 py-3">{issue.is_current ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">Joriy son</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-600">Arxiv</span>}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <IssueDownloadLink id={issue.id} lang="uz" />
                <button type="button" onClick={() => editIssue(issue)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"><Pencil size={14}/>Tahrirlash</button>
                <button type="button" disabled={saving} onClick={() => deleteIssueHandler(issue)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 size={14}/>O‘chirish</button>
              </div>
            </td>
          </tr>)}</tbody>
        </table></div>}
    </section>

    {isOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setIsOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="issue-dialog-title" className="my-auto max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="issue-dialog-title" className="text-xl font-bold text-navy-900">{editing ? 'Jurnal sonini tahrirlash' : 'Yangi jurnal soni'}</h2><p className="mt-1 text-sm text-slate-600">Muqova faylini tanlang yoki mavjud rasm manzilini kiriting.</p></div><button type="button" aria-label="Yopish" disabled={saving} onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X size={18}/></button></div>
        <form onSubmit={saveIssue} className="space-y-4">
          <p className="text-xs leading-relaxed text-slate-600">To‘plam PDF’i muqova, mundarija va nashr qilingan maqolalardan avtomatik tuziladi. Muqova yuklanmasa, jurnal nomi va son ma’lumotlari bilan tayyorlanadi. Tashqi rasm havolasi o‘rniga JPG, PNG yoki WebP faylini yuklang — shu muqova PDF’da ham ishlatiladi.</p>
          <div className="grid grid-cols-3 gap-3"><label className={labelClass}>Jild *<input className={fieldClass} type="number" required min="1" value={form.volume} onChange={event => setForm({ ...form, volume: event.target.value })}/></label><label className={labelClass}>Son *<input className={fieldClass} type="number" required min="1" value={form.issue_number} onChange={event => setForm({ ...form, issue_number: event.target.value })}/></label><label className={labelClass}>Yil *<input className={fieldClass} type="number" required min="2000" value={form.year} onChange={event => setForm({ ...form, year: event.target.value })}/></label></div>
          <div className="grid gap-3 sm:grid-cols-3"><label className={labelClass}>Sarlavha (o‘zbekcha)<input className={fieldClass} value={form.title_uz} onChange={event => setForm({ ...form, title_uz: event.target.value })} placeholder="1-jild, 1-son"/></label><label className={labelClass}>Title (English)<input className={fieldClass} value={form.title_en} onChange={event => setForm({ ...form, title_en: event.target.value })}/></label><label className={labelClass}>Заголовок (русский)<input className={fieldClass} value={form.title_ru} onChange={event => setForm({ ...form, title_ru: event.target.value })}/></label></div>
          <div className="grid gap-3 sm:grid-cols-3"><label className={labelClass}>Tavsif (o‘zbekcha)<textarea rows={3} className={fieldClass} value={form.description_uz} onChange={event => setForm({ ...form, description_uz: event.target.value })}/></label><label className={labelClass}>Description (English)<textarea rows={3} className={fieldClass} value={form.description_en} onChange={event => setForm({ ...form, description_en: event.target.value })}/></label><label className={labelClass}>Описание (русский)<textarea rows={3} className={fieldClass} value={form.description_ru} onChange={event => setForm({ ...form, description_ru: event.target.value })}/></label></div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><label className={labelClass}>Nashr sanasi *<input className={fieldClass} type="date" required value={form.publication_date} onChange={event => setForm({ ...form, publication_date: event.target.value })}/></label><label className="flex items-center gap-2 pb-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.is_current} onChange={event => setForm({ ...form, is_current: event.target.checked })} className="size-4 accent-teal-700"/>Joriy son qilib belgilash</label></div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className={labelClass}>Muqova rasmi fayli (JPG, PNG yoki WebP, 5 MB gacha)<input className={`${fieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-navy-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white`} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0] || null; setSelectedCover(file); if (!file) { setCoverPreview(''); return; } const reader = new FileReader(); reader.onload = () => setCoverPreview(typeof reader.result === 'string' ? reader.result : ''); reader.readAsDataURL(file); }}/></label>
            <div className="relative h-28 w-20 justify-self-center overflow-hidden rounded border border-slate-200 bg-navy-900 sm:justify-self-end"><IssueCoverImage src={coverPreview || form.cover_image_url.trim() || DEFAULT_COVER} alt="Muqova oldindan ko‘rinishi" className="object-cover"/></div>
            <label className={`${labelClass} sm:col-span-2`}>Yoki muqova rasmi manzili<input className={fieldClass} type="text" value={form.cover_image_url} onChange={event => setForm({ ...form, cover_image_url: event.target.value })} placeholder="/images/issue-cover-default.svg yoki https://..."/></label>
            <p className="text-xs leading-relaxed text-slate-600 sm:col-span-2">Fayl tanlansa, u manzil maydonidagi rasm o‘rniga yuklanadi. Muqova bosh sahifa, joriy son va arxivda ko‘rsatiladi.</p>
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4"><button type="button" disabled={saving} onClick={() => setIsOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Bekor qilish</button><button type="submit" disabled={saving} className="rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? uploadingCover ? 'Muqova yuklanmoqda…' : 'Saqlanmoqda…' : editing ? 'O‘zgarishlarni saqlash' : 'Yaratish'}</button></div>
        </form>
      </section>
    </div>}
  </div>;
}
