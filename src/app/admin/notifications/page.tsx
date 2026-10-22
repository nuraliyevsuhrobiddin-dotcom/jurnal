'use client';
import { useEffect, useState, useCallback } from 'react';
import type { Notification } from '@/lib/notifications';

export default function NotificationsPage() {
  const [items, setItems] = useState<Omit<Notification, 'body'>[]>([]);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/notifications');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(data.notifications); setConfigured(data.configured);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Yuklanmadi.'); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);
  async function retry() {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/notifications', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(`Yuborildi: ${data.sent}. Shu guruhda qoldi: ${data.pending}.`); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Yuborilmadi.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Email bildirishnomalari</h1>
    {!configured && <p className="text-sm text-amber-800">Email xizmati ulanmagan. Hostingda MAIL_PROVIDER va tanlangan xizmatning Gmail yoki Resend sozlamalarini kiriting. Xatlar navbatda saqlanadi.</p>}
    <p className="text-sm text-slate-600">Navbat bir urinishda 30 tagacha xatni qayta ishlaydi. Xatolardan keyin urinishlar oralig‘i uzayadi. Noaniq Gmail natijalari avtomatik takrorlanmaydi.</p>
    {items.some(item => item.status === 'unknown' || item.last_error) && <p role="alert" className="bg-amber-50 text-amber-900 p-4">Yuborilmagan yoki natijasi noaniq xatlar bor. Quyidagi xatolarni tekshiring. Ogohlantirish tahririyat emailiga ham navbatga qo‘shiladi.</p>}
    <button disabled={busy || !configured} onClick={retry} className="bg-teal-700 text-white px-4 py-2 disabled:opacity-50">{busy ? 'Yuborilmoqda...' : 'Email navbatini qayta ishlash'}</button>
    <p role="status">{message}</p>
    <div className="space-y-3">{items.map(item => <article key={item.id} className="bg-white border border-slate-200 p-4 break-words"><h2 className="font-semibold">{item.subject}</h2><p>{item.recipient}</p><p className="text-sm">{item.status === 'sent' ? 'Email xizmatiga topshirilgan' : item.status === 'unknown' ? 'Natija noaniq — Gmail Sent papkasini tekshiring' : 'Navbatda'} · {item.attempts} urinish</p>{item.last_error && <p className="text-red-700 text-sm">{item.last_error}</p>}</article>)}</div>
  </div>;
}
