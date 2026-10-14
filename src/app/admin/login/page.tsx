'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get('password');
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      router.push('/admin'); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Aloqa uzildi.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
    <form onSubmit={login} className="w-full max-w-md bg-white p-8 rounded-2xl space-y-6 shadow-xl">
      <ShieldCheck className="w-10 h-10 text-gold-700" /><h1 className="text-2xl font-bold text-navy-900">AGM boshqaruv paneli</h1>
      <p className="text-slate-600">Tahririyat ma’lumotlarini boshqarish uchun kiring.</p>
      <div><label htmlFor="password" className="block mb-2 font-semibold">Admin paroli</label><input id="password" name="password" type="password" autoComplete="current-password" required className="border border-slate-300 rounded-lg p-3 w-full" /></div>
      {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
      <button disabled={busy} className="bg-navy-900 text-white rounded-lg p-3 w-full font-semibold disabled:opacity-60">{busy ? 'Kirilmoqda…' : 'Kirish'}</button>
      <Link href="/uz" className="block text-center text-teal-800">Saytga qaytish</Link>
    </form>
  </main>;
}
