'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { EditorialBoardMember } from '@/types/journal';
import { Check, Pencil, Plus, RotateCcw, Search, UserRound, X } from 'lucide-react';

type MemberForm = Omit<EditorialBoardMember, 'id' | 'created_at'>;
const emptyForm: MemberForm = {
  full_name: '', academic_title: '', academic_degree: '', affiliation: '', country: '', email: '', orcid: '',
  role: 'editorial_board_member', order_index: 1, is_active: true,
};
const roles: Record<EditorialBoardMember['role'], string> = {
  editor_in_chief: 'Bosh muharrir', deputy_editor: 'Bosh muharrir o‘rinbosari',
  editorial_board_member: 'Tahririyat hay’ati a’zosi', scientific_secretary: 'Ilmiy kotib', managing_editor: 'Mas’ul muharrir',
};

export default function AdminEditorialBoardPage() {
  const [members, setMembers] = useState<EditorialBoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/editorial-board');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Ro‘yxatni yuklab bo‘lmadi.');
      setMembers(body);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ro‘yxatni yuklab bo‘lmadi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadMembers); }, [loadMembers]);

  const visibleMembers = useMemo(() => members.filter(member => {
    const text = [member.full_name, member.academic_title, member.academic_degree, member.affiliation, member.country, member.email, member.orcid].join(' ').toLocaleLowerCase();
    return (showInactive || member.is_active) && text.includes(search.toLocaleLowerCase());
  }), [members, search, showInactive]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, order_index: members.length + 1 });
    setError(''); setNotice(''); setDialogOpen(true);
  }

  function openEdit(member: EditorialBoardMember) {
    setEditingId(member.id);
    setForm({
      full_name: member.full_name, academic_title: member.academic_title ?? '', academic_degree: member.academic_degree ?? '',
      affiliation: member.affiliation, country: member.country, email: member.email ?? '', orcid: member.orcid ?? '',
      role: member.role, order_index: member.order_index, is_active: member.is_active,
    });
    setError(''); setNotice(''); setDialogOpen(true);
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await fetch(editingId ? `/api/admin/editorial-board/${editingId}` : '/api/admin/editorial-board', {
        method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) {
        const detail = body.details?.fieldErrors;
        const firstFieldError = detail && Object.values(detail).flat()[0];
        throw new Error(firstFieldError || body.error || 'Saqlash amalga oshmadi.');
      }
      setDialogOpen(false); setNotice(editingId ? 'A’zo ma’lumotlari yangilandi.' : 'Yangi a’zo qo‘shildi.');
      await loadMembers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Saqlash amalga oshmadi.');
    } finally { setSaving(false); }
  }

  async function deactivateMember(member: EditorialBoardMember) {
    if (member.is_active && !window.confirm(`${member.full_name} a’zosini saytdagi ro‘yxatdan yashiraymi? Ma’lumotlari saqlanadi.`)) return;
    setError(''); setNotice(''); setSaving(true);
    try {
      const response = await fetch(`/api/admin/editorial-board/${member.id}`, member.is_active
        ? { method: 'DELETE' }
        : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...member, is_active: true }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Holatni yangilab bo‘lmadi.');
      setNotice(member.is_active ? 'A’zo nofaol qilindi. Ma’lumotlari saqlandi.' : 'A’zo yana faollashtirildi.');
      await loadMembers();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Holatni yangilab bo‘lmadi.'); }
    finally { setSaving(false); }
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20';
  const labelClass = 'block text-xs font-semibold text-slate-700';

  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div><h1 className="text-2xl font-extrabold text-navy-900">Tahririyat a’zolari</h1><p className="mt-1 text-sm text-slate-600">A’zolar, lavozimlar va saytda ko‘rinish tartibini boshqaring.</p></div>
      <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800"><Plus size={17} /> A’zo qo‘shish</button>
    </header>

    {error && !dialogOpen && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
        <label className="relative flex-1"><span className="sr-only">A’zolarni qidirish</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Ism, lavozim yoki tashkilot bo‘yicha qidiring" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900" /></label>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} className="size-4 accent-teal-700"/>Nofaol a’zolarni ham ko‘rsatish</label>
      </div>
      {loading ? <p className="p-10 text-center text-sm text-slate-600">Ro‘yxat yuklanmoqda…</p> : visibleMembers.length === 0 ? <div className="p-12 text-center"><UserRound className="mx-auto mb-3 text-slate-400"/><p className="font-semibold text-slate-800">A’zolar topilmadi</p><p className="mt-1 text-sm text-slate-600">Qidiruvni o‘zgartiring yoki yangi a’zo qo‘shing.</p></div> :
        <div className="divide-y divide-slate-100">{visibleMembers.map(member => <article key={member.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-navy-900">{member.full_name}</h2><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${member.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{member.is_active ? 'Faol' : 'Nofaol'}</span><span className="rounded-full bg-gold-50 px-2.5 py-1 text-[11px] font-semibold text-gold-900">{roles[member.role]}</span></div>
            <p className="mt-1 text-sm text-slate-700">{[member.academic_title, member.academic_degree].filter(Boolean).join(' · ') || 'Ilmiy unvon ko‘rsatilmagan'}</p><p className="mt-1 text-sm text-slate-600">{member.affiliation} · {member.country}</p>
            <p className="mt-1 break-all text-xs text-slate-600">{[member.email, member.orcid && `ORCID: ${member.orcid}`, `Tartib: ${member.order_index}`].filter(Boolean).join(' · ')}</p>
          </div><div className="flex shrink-0 gap-2"><button type="button" disabled={saving} onClick={() => openEdit(member)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"><Pencil size={14}/>Tahrirlash</button><button type="button" disabled={saving} onClick={() => void deactivateMember(member)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${member.is_active ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'}`}>{member.is_active ? <X size={14}/> : <RotateCcw size={14} />}{member.is_active ? 'Nofaol qilish' : 'Faollashtirish'}</button></div>
        </article>)}</div>}
    </section>

    {dialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setDialogOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="editorial-dialog-title" className="my-auto max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="editorial-dialog-title" className="text-xl font-bold text-navy-900">{editingId ? 'A’zo ma’lumotlarini tahrirlash' : 'Yangi tahririyat a’zosi'}</h2><p className="mt-1 text-sm text-slate-600">Majburiy maydonlar yulduzcha bilan belgilangan.</p></div><button type="button" aria-label="Yopish" disabled={saving} onClick={() => setDialogOpen(false)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X size={19}/></button></div>
        <form onSubmit={saveMember} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>To‘liq ism-familiya *<input required minLength={2} maxLength={160} autoFocus value={form.full_name} onChange={event => setForm({ ...form, full_name: event.target.value })} className={inputClass}/></label>
            <label className={labelClass}>Lavozim *<select required value={form.role} onChange={event => setForm({ ...form, role: event.target.value as EditorialBoardMember['role'] })} className={inputClass}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className={labelClass}>Ilmiy unvon<input maxLength={160} value={form.academic_title} onChange={event => setForm({ ...form, academic_title: event.target.value })} placeholder="Professor, dotsent…" className={inputClass}/></label>
            <label className={labelClass}>Ilmiy daraja<input maxLength={240} value={form.academic_degree} onChange={event => setForm({ ...form, academic_degree: event.target.value })} placeholder="PhD, DSc…" className={inputClass}/></label>
            <label className={labelClass}>Tashkilot *<input required minLength={2} maxLength={240} value={form.affiliation} onChange={event => setForm({ ...form, affiliation: event.target.value })} className={inputClass}/></label>
            <label className={labelClass}>Mamlakat *<input required minLength={2} maxLength={100} value={form.country} onChange={event => setForm({ ...form, country: event.target.value })} className={inputClass}/></label>
            <label className={labelClass}>Elektron pochta<input type="email" maxLength={254} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className={inputClass}/></label>
            <label className={labelClass}>ORCID<input inputMode="text" pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9Xx]" title="0000-0000-0000-0000 ko‘rinishida kiriting" value={form.orcid} onChange={event => setForm({ ...form, orcid: event.target.value.toUpperCase() })} placeholder="0000-0000-0000-0000" className={inputClass}/></label>
            <label className={labelClass}>Ko‘rsatish tartibi *<input type="number" required min={0} max={10000} value={form.order_index} onChange={event => setForm({ ...form, order_index: Number(event.target.value) })} className={inputClass}/></label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} className="size-4 accent-teal-700"/>Saytda faol ko‘rsatish</label>
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4"><button type="button" disabled={saving} onClick={() => setDialogOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Bekor qilish</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800 disabled:opacity-60">{saving ? 'Saqlanmoqda…' : <><Check size={16}/>{editingId ? 'O‘zgarishlarni saqlash' : 'A’zoni qo‘shish'}</>}</button></div>
        </form>
      </section>
    </div>}
  </div>;
}
