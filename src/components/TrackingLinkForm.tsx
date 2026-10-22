'use client';
import { useState } from 'react';
export function TrackingLinkForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <form className="space-y-5 max-w-xl" onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setMessage('');
    const values = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/submissions/tracking-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(values)) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setMessage(data.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'So‘rov yuborilmadi.'); }
    finally { setBusy(false); }
  }}>
    <label className="block">Mas’ul muallif emaili / Corresponding author email<input name="email" type="email" required autoComplete="email" className="block mt-2 border border-slate-300 rounded-lg p-3 w-full" /></label>
    <label className="block">Yuborish raqami / Submission reference<input name="reference" required pattern="[Aa][Gg][Mm]-[Ss][Uu][Bb]-[a-fA-F0-9]{8}" placeholder="AGM-SUB-XXXXXXXX" maxLength={16} className="block mt-2 border border-slate-300 rounded-lg p-3 w-full" /></label>
    <button disabled={busy} className="bg-teal-700 text-white rounded-lg px-5 py-3 disabled:opacity-50">{busy ? 'Yuborilmoqda… / Sending…' : 'Kuzatish havolasini olish / Get tracking link'}</button>
    <p role="status" className="text-sm leading-relaxed">{message}</p>
  </form>;
}
