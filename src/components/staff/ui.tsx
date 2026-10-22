'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-gold-500';
export const button = 'rounded-lg bg-navy-900 px-5 py-2.5 font-semibold text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 disabled:cursor-wait disabled:opacity-50';
export const panel = 'rounded-xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm';
export async function api<T>(url: string, body?: unknown, method = 'POST'): Promise<T> {
  const response = await fetch(url, body === undefined ? { cache: 'no-store' } : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'So‘rov bajarilmadi. Qayta urinib ko‘ring.');
  return data as T;
}
export function Notice({ error, message }: { error?: string; message?: string }) {
  return <>{error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}</>;
}
export function Heading({ title, children }: { title: string; children: ReactNode }) {
  return <header className="mb-7 border-b border-slate-200 pb-5"><p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold-700">AGM · Tahririyat</p><h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{children}</p></header>;
}
export function StaffShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const logout = async () => { try { await api('/api/staff/logout', {}); router.replace('/admin/login'); router.refresh(); } catch { window.alert('Hisobdan chiqilmadi. Qayta urinib ko‘ring.'); } };
  return <div className="min-h-screen bg-slate-100"><header className="bg-navy-950 text-white"><nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-5 px-5 py-5 text-sm"><Link href="/reviewer" className="mr-auto font-bold text-gold-400">AGM · Tahririyat</Link><Link href="/staff/security">Hisob xavfsizligi</Link><button onClick={logout} className="underline underline-offset-4">Chiqish</button></nav></header><main className="mx-auto max-w-5xl px-5 py-9">{children}</main></div>;
}
export function date(value: string | null) { return value ? new Date(value).toLocaleDateString('uz-UZ') : 'Belgilanmagan'; }
export function datetime(value: string | null) {
  return value ? new Intl.DateTimeFormat('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value)) : 'Belgilanmagan';
}
export const recommendations: Record<string, string> = { accept: 'Nashrga tavsiya', minor_revision: 'Kichik tuzatish', major_revision: 'Jiddiy tuzatish', reject: 'Rad etish' };
export const statuses: Record<string, string> = { assigned: 'Taqriz kutilmoqda', submitted: 'Taqriz topshirilgan', cancelled: 'Bekor qilingan' };
