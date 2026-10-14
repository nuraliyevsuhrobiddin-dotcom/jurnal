'use client';

import React, { useState, useEffect } from 'react';
import { JournalSettings } from '@/types/journal';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<JournalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(async res => { if (!res.ok) throw new Error('Sozlamalar yuklanmadi.'); return res.json(); })
      .then(data => setSettings(data))
      .catch(cause => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    setError('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage('Sozlamalar muvaffaqiyatli saqlandi!');
      } else { const body = await res.json(); throw new Error(body.error || 'Sozlamalar saqlanmadi.'); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sozlamalar saqlanmadi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        {error || 'Sozlamalar yuklanmoqda...'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="p-4 bg-red-50 text-red-800 rounded-lg">{error}</p>}
      <div className="bg-white p-6 rounded-2xl academic-border academic-shadow">
        <h1 className="text-2xl font-extrabold text-navy-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-gold-700" />
          <span>Jurnal bosh sozlamalari</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Jurnal nomi, ISSN raqamlari, nashriyot va aloqa ma’lumotlari
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl academic-border academic-shadow p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Jurnal nomi
            </label>
            <input
              type="text"
              required
              value={settings.journal_name}
              onChange={e => setSettings({ ...settings, journal_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nashriyot / Muassis
            </label>
            <input
              type="text"
              required
              value={settings.publisher}
              onChange={e => setSettings({ ...settings, publisher: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ISSN (Online)
            </label>
            <input
              type="text"
              value={settings.issn_online || ''}
              onChange={e => setSettings({ ...settings, issn_online: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ISSN (Bosma / Print)
            </label>
            <input
              type="text"
              value={settings.issn_print || ''}
              onChange={e => setSettings({ ...settings, issn_print: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Aloqa elektron pochtasi
            </label>
            <input
              type="email"
              required
              value={settings.contact_email}
              onChange={e => setSettings({ ...settings, contact_email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Aloqa telefoni
            </label>
            <input
              type="text"
              value={settings.contact_phone || ''}
              onChange={e => setSettings({ ...settings, contact_phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Rasmiy manzil
            </label>
            <input
              type="text"
              value={settings.address || ''}
              onChange={e => setSettings({ ...settings, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              DOI Prefiks (Zenodo / Crossref)
            </label>
            <input
              type="text"
              value={settings.doi_prefix || ''}
              onChange={e => setSettings({ ...settings, doi_prefix: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-900"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors"
          >
            <Save className="w-4 h-4 text-gold-400" />
            <span>{saving ? 'Saqlanmoqda...' : 'O‘zgarishlarni saqlash'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
