'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorialMessage } from '@/lib/editorial-messages';

export function EditorialCorrespondence({ articleId }: { articleId: string }) {
  const [messages, setMessages] = useState<EditorialMessage[]>([]);
  const [tracking, setTracking] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<'note' | 'revision_requested'>('note');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const eventId = useRef('');
  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/articles/${articleId}/correspondence`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setMessages(data.messages); setTracking(data.tracking_url);
  }, [articleId]);
  useEffect(() => { const timer = setTimeout(() => { load().catch(error => setStatus(error.message)); }, 0); return () => clearTimeout(timer); }, [load]);
  async function send() {
    if (busy) return;
    setBusy(true); setStatus('');
    eventId.current ||= crypto.randomUUID();
    try {
      const response = await fetch(`/api/admin/articles/${articleId}/correspondence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: eventId.current, body, kind }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setStatus(data.warning || 'Izoh saqlandi va muallif emaili navbatga qo‘shildi.');
      if (!data.warning) { setBody(''); eventId.current = ''; }
      await load();
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Yuborilmadi.'); }
    finally { setBusy(false); }
  }
  return <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
    <h2 className="text-xl font-bold">Muallif bilan yozishmalar</h2>
    <p className="text-sm text-slate-600">Izoh muallifga email orqali yuboriladi va maxfiy kuzatish sahifasida ko‘rinadi.</p>
    {tracking && <a href={tracking} target="_blank" rel="noreferrer" className="text-teal-700 underline">Muallifning maxfiy kuzatish sahifasi ↗</a>}
    <label className="block text-sm">Xabar turi<select value={kind} onChange={event => { setKind(event.target.value as typeof kind); eventId.current = ''; }} className="block w-full border rounded p-2 mt-1"><option value="note">Tahririyat izohi</option><option value="revision_requested">Tuzatish so‘rash</option></select></label>
    {kind === 'revision_requested' && <p className="text-sm text-amber-800">Maqola taqriz holatiga o‘tadi. Qanday tuzatishlar kerakligini aniq yozing.</p>}
    <label className="block text-sm">Muallifga izoh<textarea value={body} onChange={event => { setBody(event.target.value); eventId.current = ''; }} minLength={5} maxLength={10000} rows={5} className="block w-full border rounded p-3 mt-1" /></label>
    <button type="button" disabled={busy || body.trim().length < 5} onClick={send} className="bg-teal-700 text-white rounded px-4 py-2 disabled:opacity-50">{busy ? 'Yuborilmoqda…' : 'Izohni yuborish'}</button>
    <p role="status" className="text-sm">{status}</p>
    {messages.map(message => <article key={message.id} className="border-t pt-3"><p className="text-xs text-slate-500">{message.kind === 'revision_requested' ? 'Tuzatish so‘rovi' : 'Tahririyat izohi'} · {new Date(message.created_at).toLocaleString('uz-UZ')}</p><p className="whitespace-pre-wrap break-words">{message.body}</p></article>)}
  </section>;
}
