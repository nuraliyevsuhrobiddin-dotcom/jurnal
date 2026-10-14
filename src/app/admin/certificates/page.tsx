'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Certificate } from '@/types/journal';
import { Download, ExternalLink, XCircle, Search, Trash2 } from 'lucide-react';

export default function AdminCertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadCerts = () => {
    return fetch('/api/admin/certificates')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCerts(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCerts();
  }, []);

  const handleRevoke = async (cert: Certificate) => {
    const reason = prompt(`"${cert.certificate_number}" raqamli sertifikatni bekor qilish sababini kiriting:`);
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch('/api/admin/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', id: cert.id, reason }),
      });
      if (res.ok) {
        await loadCerts();
      } else {
        alert('Sertifikatni bekor qilishda xatolik yuz berdi');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCert = async (cert: Certificate) => {
    if (!window.confirm(`"${cert.certificate_number}" sertifikatini butunlay o‘chirmoqchimisiz?`)) return;
    try {
      const res = await fetch(`/api/admin/certificates?id=${cert.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadCerts();
      } else {
        alert('Sertifikatni o‘chirishda xatolik yuz berdi');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = certs.filter(c =>
    !search ||
    c.certificate_number.toLowerCase().includes(search.toLowerCase()) ||
    c.author_name.toLowerCase().includes(search.toLowerCase()) ||
    c.article_title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl academic-border academic-shadow">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">
            Mualliflik sertifikatlari reestri
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Jami sertifikatlar: <strong>{certs.length} ta</strong> • QR-kod bilan himoyalangan rasmiy hujjatlar
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl academic-border academic-shadow">
        <div className="relative flex items-center bg-slate-50 rounded-lg px-3">
          <Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sertifikat raqami, muallif yoki maqola nomi bo‘yicha qidirish..."
            className="w-full py-2 bg-transparent text-xs sm:text-sm text-slate-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white rounded-2xl academic-border academic-shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Sertifikatlar yuklanmoqda...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Mos keluvchi sertifikatlar topilmadi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-navy-900 text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Sertifikat Nomeri</th>
                  <th className="py-3.5 px-4 font-semibold">Muallif & Tashkilot</th>
                  <th className="py-3.5 px-4 font-semibold">Maqola</th>
                  <th className="py-3.5 px-4 font-semibold">Sana</th>
                  <th className="py-3.5 px-4 font-semibold">Holati</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(cert => (
                  <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-navy-900 whitespace-nowrap">
                      {cert.certificate_number}
                      <span className="block text-[10px] text-slate-500 font-sans">{cert.verification_code}</span>
                    </td>

                    <td className="py-4 px-4 text-xs">
                      <div className="font-bold text-slate-800">{cert.author_name}</div>
                      <div className="text-slate-500 text-[11px] line-clamp-1">{cert.author_affiliation}</div>
                    </td>

                    <td className="py-4 px-4 text-xs max-w-xs">
                      <div className="font-medium text-slate-700 line-clamp-2">&ldquo;{cert.article_title}&rdquo;</div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500">
                      {cert.issue_date}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      {cert.status === 'valid' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                          Haqiqiy (Valid)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase">
                          Bekor qilingan
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/certificate/${cert.certificate_number}`}
                          target="_blank"
                          title="Tekshirish sahifasini ochish"
                          className="p-1.5 rounded text-slate-500 hover:text-navy-900 hover:bg-slate-100"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        <a
                          href={`/api/certificates/${cert.certificate_number}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="PDF yuklab olish"
                          className="p-1.5 rounded text-gold-700 hover:text-gold-700 hover:bg-gold-50"
                        >
                          <Download className="w-4 h-4" />
                        </a>

                        {cert.status === 'valid' && (
                          <button
                            onClick={() => handleRevoke(cert)}
                            title="Sertifikatni bekor qilish"
                            className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteCert(cert)}
                          title="Sertifikatni butunlay o‘chirish"
                          className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
