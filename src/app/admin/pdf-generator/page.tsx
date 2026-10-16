'use client';

import React, { useState } from 'react';
import { FileUp, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ParsedDocxResult } from '@/lib/pdf/docx-parser';
import { PdfUpload } from '@/components/admin/PdfUpload';

export default function AdminPdfGeneratorPage() {
  const [activeTab, setActiveTab] = useState<'docx' | 'pdf'>('docx');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(ParsedDocxResult & { fileName: string; fileSize: number; htmlPreview: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/docx/parse', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'DOCX tahlilida xatolik');
      setResult(data);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl academic-border academic-shadow">
        <h1 className="text-2xl font-extrabold text-navy-900">
          DOCX va PDF generator vositasi
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Word hujjatlarini tahlil qilish va maqola PDF’larini jurnal maketida tayyorlash
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('docx')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'docx'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Word (DOCX) tahlili
        </button>
        <button
          onClick={() => setActiveTab('pdf')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'pdf'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Jurnal PDF maketi
        </button>
      </div>

      {/* Tab B: DOCX Parsing */}
      {activeTab === 'docx' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl academic-border academic-shadow text-center space-y-4">
            <div className="w-14 h-14 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center mx-auto">
              <FileUp className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-navy-900">
                Word (.docx) faylini yuklang
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Tizim avtomatik ravishda sarlavha, annotatsiya, kalit so‘zlar, adabiyotlar ro‘yxati va matn hajmini tahlil qiladi.
              </p>
            </div>

            <label className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-md">
              <FileText className="w-4 h-4 text-gold-400" />
              <span>{loading ? 'Fayl o‘qilmoqda...' : 'DOCX faylni tanlash'}</span>
              <input
                type="file"
                accept=".docx"
                disabled={loading}
                onChange={handleDocxUpload}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="bg-white rounded-2xl academic-border academic-shadow p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm border-b pb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>DOCX muvaffaqiyatli tahlil qilindi ({result.fileName})</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">So‘zlar soni:</span>
                  <span className="font-bold text-navy-900 text-base">{result.wordCount}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Fayl hajmi:</span>
                  <span className="font-bold text-navy-900 text-base">{(result.fileSize / 1024).toFixed(1)} KB</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Kalit so‘zlar:</span>
                  <span className="font-bold text-navy-900 text-base">{result.extractedKeywords?.length || 0} ta</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Adabiyotlar:</span>
                  <span className="font-bold text-navy-900 text-base">{result.extractedReferences?.length || 0} ta</span>
                </div>
              </div>

              {result.extractedTitle && (
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Aniqlangan sarlavha:</span>
                  <p className="p-3 bg-slate-50 rounded-xl font-bold text-sm text-navy-900">
                    {result.extractedTitle}
                  </p>
                </div>
              )}

              {result.extractedAbstract && (
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Aniqlangan annotatsiya:</span>
                  <p className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed">
                    {result.extractedAbstract}
                  </p>
                </div>
              )}

              {result.rawText && (
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">DOCX HTML struktura preview:</span>
                  <div className="p-4 bg-slate-50 rounded-xl border text-xs max-h-64 overflow-y-auto whitespace-pre-wrap text-slate-700">{result.rawText}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab A: PDF Mode */}
      {activeTab === 'pdf' && (
        <div className="bg-white rounded-2xl academic-border academic-shadow p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-navy-900">
              Maqolani nashrga tayyorlash
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bu yerda maqolaning o‘z PDF yoki DOCX fayli saqlanadi. PDF yuklab olinganda birinchi betdan to‘liq maqola chiqadi; annotatsiya yoki qo‘llanma uning o‘rniga berilmaydi. PDF’dagi matn, jadvallar va formulalar saqlanadi.
            </p>
          </div>

          <PdfUpload />
        </div>
      )}
    </div>
  );
}
