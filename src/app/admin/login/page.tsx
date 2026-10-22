'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { api, button, field, Notice } from '@/components/staff/ui';
export default function LoginPage() {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function login(event: React.FormEvent<HTMLFormElement>, legacy = false) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError('');
    try { await api(legacy ? '/api/admin/session' : '/api/staff/login', legacy ? { password: form.get('password') } : { email: form.get('email'), password: form.get('password') }); window.location.assign(legacy ? '/admin' : '/staff/security'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Aloqa uzildi.'); } finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-navy-950 p-5"><section className="w-full max-w-md space-y-6 rounded-2xl bg-white p-7 shadow-xl sm:p-9"><ShieldCheck className="h-10 w-10 text-gold-700" /><h1 className="text-2xl font-bold text-navy-900">Tahririyatga kirish</h1><p className="text-sm leading-6 text-slate-600">Shaxsiy hisobingiz bilan kiring. Paroldan so‘ng autentifikator kodi so‘raladi.</p><Notice error={error} /><form onSubmit={e => login(e)} className="space-y-5"><label className="block text-sm font-semibold">Email<input name="email" type="email" autoComplete="username" required className={`${field} mt-2`} /></label><label className="block text-sm font-semibold">Parol<input name="password" type="password" autoComplete="current-password" required className={`${field} mt-2`} /></label><button disabled={busy} className={`${button} w-full`}>{busy ? 'Kirilmoqda…' : 'Davom etish'}</button></form><details className="border-t border-slate-200 pt-5 text-sm"><summary className="cursor-pointer text-slate-600">Vaqtinchalik umumiy parol orqali kirish</summary><form onSubmit={e => login(e, true)} className="mt-4 space-y-4"><p className="text-slate-600">Shaxsiy hisoblarga o‘tish davri uchun. Bosh muharrir bu usulni o‘chirishi mumkin.</p><label className="block font-semibold">Umumiy admin paroli<input name="password" type="password" autoComplete="current-password" required className={`${field} mt-2`} /></label><button disabled={busy} className={button}>Umumiy parol bilan kirish</button></form></details><Link href="/uz" className="block text-center text-sm text-teal-800">Saytga qaytish</Link></section></main>;
}
