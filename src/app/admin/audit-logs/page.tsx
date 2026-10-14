'use client';

import React, { useState, useEffect } from 'react';
import { AuditLog } from '@/types/journal';
import { History, Search } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/audit-logs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLogs(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    !search ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.user_email && l.user_email.toLowerCase().includes(search.toLowerCase())) ||
    l.entity_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl academic-border academic-shadow">
        <h1 className="text-2xl font-extrabold text-navy-900 flex items-center gap-2">
          <History className="w-6 h-6 text-gold-700" />
          <span>Audit va xavfsizlik jurnali</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Barcha administrator harakatlari, maqola statuslari o‘zgarishi va sertifikatlar qaydnomasi
        </p>
      </div>

      <div className="bg-white p-3 rounded-xl academic-border academic-shadow">
        <div className="relative flex items-center bg-slate-50 rounded-lg px-3">
          <Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Amal (Action), foydalanuvchi yoki obyekt turi bo‘yicha qidirish..."
            className="w-full py-2 bg-transparent text-xs sm:text-sm text-slate-900 focus:outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl academic-border academic-shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Audit loglar yuklanmoqda...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Mos keluvchi audit yozuvlari topilmadi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-navy-900 text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Vaqt (UTC)</th>
                  <th className="py-3.5 px-4 font-semibold">Amal (Action)</th>
                  <th className="py-3.5 px-4 font-semibold">Obyekt</th>
                  <th className="py-3.5 px-4 font-semibold">Foydalanuvchi / IP</th>
                  <th className="py-3.5 px-4 font-semibold">Tafsilotlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-navy-900">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                      {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ''}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      <div>{log.user_email || 'Tizim'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{log.ip_address}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate font-mono">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
