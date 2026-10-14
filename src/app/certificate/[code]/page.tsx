import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCertificateByCode } from '@/lib/db';
import { CheckCircle2, XCircle, Download, ArrowLeft } from 'lucide-react';

export default async function DedicatedCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cert = await getCertificateByCode(code);

  if (!cert) {
    notFound();
  }

  const isValid = cert.status === 'valid';

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Print Actions */}
        <div className="flex items-center justify-between no-print">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>AGM Journal Bosh sahifasi</span>
          </Link>

          <div className="flex items-center gap-3">
            {isValid && <Link
              href={`/api/certificates/${cert.certificate_number}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-navy-900 text-white hover:bg-navy-800 text-xs font-bold shadow-md transition-colors"
            >
              <Download className="w-4 h-4 text-gold-400" />
              <span>PDF yuklab olish</span>
            </Link>}
          </div>
        </div>

        {/* Certificate Display Frame */}
        <div className="bg-white rounded-2xl certificate-frame p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          {/* Status Watermark */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border">
              {isValid ? (
                <span className="bg-emerald-50 text-emerald-800 border-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Haqiqiy sertifikat • QR Verified
                </span>
              ) : (
                <span className="bg-rose-50 text-rose-800 border-rose-300 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Sertifikat bekor qilingan
                </span>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase font-extrabold tracking-widest text-navy-900 block">
                AGM SCIENTIFIC PUBLISHING ACADEMY
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-navy-900">
                AGM <span className="text-gold-700 font-serif italic">JOURNAL</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider">
                International Multidisciplinary Scientific Journal • ISSN: 2959-5678
              </p>
            </div>

            <div className="py-2">
              <span className="text-lg sm:text-xl font-bold text-gold-700 uppercase tracking-widest block font-serif">
                SERTIFIKAT / CERTIFICATE
              </span>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                Ilmiy maqola muallifligini tasdiqlovchi rasmiy hujjat
              </p>
            </div>

            {/* Author */}
            <div className="pt-4 pb-2 space-y-1">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Taqdim etildi / Presented to:</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-navy-900">
                {cert.author_name}
              </h2>
              {cert.author_affiliation && (
                <p className="text-xs sm:text-sm text-slate-600 italic max-w-lg mx-auto">
                  {cert.author_affiliation}
                </p>
              )}
            </div>

            {/* Paper Title */}
            <div className="py-4 space-y-1 border-y border-slate-200/60 max-w-xl mx-auto">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Maqola nomi / Article Title:</span>
              <p className="text-base sm:text-lg font-bold text-navy-900 leading-snug">
                &ldquo;{cert.article_title}&rdquo;
              </p>
            </div>

            {/* Publication metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs text-slate-600">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Jild / Volume:</span>
                <span className="font-bold text-slate-800">{cert.issue_volume}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Son / Issue:</span>
                <span className="font-bold text-slate-800">{cert.issue_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Yil / Year:</span>
                <span className="font-bold text-slate-800">{cert.issue_year}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Nashr sanasi:</span>
                <span className="font-bold text-slate-800">{cert.issue_date}</span>
              </div>
            </div>

            {/* Bottom registry barcodes & signatures */}
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100 text-xs">
              <div className="text-left font-mono space-y-1">
                <p className="text-slate-700 font-bold">Nomer: {cert.certificate_number}</p>
                <p className="text-slate-500">Tekshiruv kodi: {cert.verification_code}</p>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src="/images/agm-journal-seal.png"
                  alt="AGM Journal Rasmiy Muhr"
                  className="w-16 h-16 object-contain opacity-95 drop-shadow-sm select-none"
                />
                <div className="text-right space-y-1">
                  <span className="block font-bold text-navy-900">Bosh muharrir / Editor-in-Chief</span>
                  <span className="block text-slate-600 text-xs">Akad. Sh. Ayupov</span>
                  <span className="block text-[10px] text-gold-700 font-serif italic">AGM Journal Tahririyati</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
