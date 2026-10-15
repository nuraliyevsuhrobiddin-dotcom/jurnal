'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Language } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';

export function ContactForm({ lang = 'uz' }: { lang?: Language }) {
  const dict = getDictionary(lang).contact;
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus('sending');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || dict.errorMsg);
      setStatus('success');
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : dict.errorMsg);
      setStatus('error');
    }
  }

  return (
    <form onSubmit={submit} className="contact-form space-y-5">
      <div>
        <label htmlFor="contact-name" className="block text-sm font-semibold mb-2">{dict.nameLabel}</label>
        <input id="contact-name" name="name" autoComplete="name" required minLength={2} maxLength={150} placeholder={dict.namePlaceholder} className="w-full px-4 py-3 rounded-lg border border-slate-300" />
      </div>
      <div>
        <label htmlFor="contact-email" className="block text-sm font-semibold mb-2">{dict.emailLabel}</label>
        <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder={dict.emailPlaceholder} className="w-full px-4 py-3 rounded-lg border border-slate-300" />
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-sm font-semibold mb-2">{dict.messageLabel}</label>
        <textarea id="contact-message" name="message" rows={6} required minLength={10} maxLength={5000} placeholder={dict.messagePlaceholder} className="w-full px-4 py-3 rounded-lg border border-slate-300" />
      </div>
      <p aria-live="polite" className={status === 'error' ? 'text-sm text-red-700' : 'text-sm text-emerald-700'}>
        {status === 'success' ? dict.successMsg : status === 'error' ? error : ''}
      </p>
      <button disabled={status === 'sending'} className="w-full inline-flex justify-center items-center gap-2 py-3 bg-navy-900 hover:bg-navy-800 rounded-lg text-white font-semibold disabled:opacity-60 transition-colors">
        <Send className="w-4 h-4" />{status === 'sending' ? dict.sendingBtn : dict.sendBtn}
      </button>
    </form>
  );
}
