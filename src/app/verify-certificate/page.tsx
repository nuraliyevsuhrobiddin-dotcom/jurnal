import React from 'react';
import Link from 'next/link';
import { getCertificateByCode } from '@/lib/db';
import { Award, Search, CheckCircle2, XCircle, AlertTriangle, Download, ArrowLeft, ExternalLink } from 'lucide-react';

export default async function VerifyCertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const cert = code ? await getCertificateByCode(code) : null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Bosh sahifaga qaytish</span>
          </Link>

          <div className="w-16 h-16 rounded-2xl bg-navy-900 flex items-center justify-center text-gold-400 mx-auto shadow-lg">
            <Award className="w-8 h-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
            Mualliflik sertifikatini tekshirish
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            AGM Journal tomonidan taqdim etilgan rasmiy maqola mualliflik sertifikati haqiqiyligini tekshirish portali
          </p>
        </div>

        {/* Search input form */}
        <form method="GET" className="bg-white p-3 rounded-2xl academic-border academic-shadow flex gap-2">
          <div className="relative flex-1 flex items-center px-3">
            <Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
            <input
              type="text"
              name="code"
              defaultValue={code || ''}
              required
              placeholder="Sertifikat raqami (masalan: AGM-CERT-2026-000101)"
              className="w-full py-2 bg-transparent text-sm text-slate-900 focus:outline-none font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs sm:text-sm font-semibold transition-colors shrink-0"
          >
            Tekshirish
          </button>
        </form>

        {/* Verification Result */}
        {code && (
          <div>
            {cert ? (
              cert.status === 'valid' ? (
                /* VALID CERTIFICATE CARD */
                <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-xl overflow-hidden">
                  <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wide">
                        Haqiqiy va tasdiqlangan sertifikat
                      </h3>
                      <p className="text-xs text-emerald-800">
                        Ushbu sertifikat AGM Journal bazasida ro‘yxatga olingan.
                      </p>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 space-y-5 text-xs sm:text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <span className="text-slate-500 text-xs block">Sertifikat raqami:</span>
                        <span className="font-bold text-navy-900 font-mono text-base">{cert.certificate_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs block">Verifikatsiya kodi:</span>
                        <span className="font-bold text-gold-700 font-mono text-base">{cert.verification_code}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 text-xs block">Sertifikat egasi (Muallif):</span>
                      <span className="font-bold text-slate-900 text-base">{cert.author_name}</span>
                      {cert.author_affiliation && (
                        <p className="text-xs text-slate-500 italic mt-0.5">{cert.author_affiliation}</p>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-500 text-xs block">Ilmiy maqola nomi:</span>
                      <span className="font-bold text-navy-900 leading-snug block mt-0.5">
                        &ldquo;{cert.article_title}&rdquo;
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <span className="text-slate-500 text-xs block">Jurnal soni:</span>
                        <span className="font-semibold text-slate-800">
                          {cert.journal_name}, Vol. {cert.issue_volume}, No. {cert.issue_number} ({cert.issue_year})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs block">Berilgan sana:</span>
                        <span className="font-semibold text-slate-800">{cert.issue_date}</span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <Link
                        href={`/certificate/${cert.certificate_number}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline"
                      >
                        <span>Doimiy havola sahifasi</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <a
                        href={`/api/certificates/${cert.certificate_number}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-900 text-white hover:bg-navy-800 text-xs font-bold transition-colors shadow-md"
                      >
                        <Download className="w-4 h-4 text-gold-400" />
                        <span>Rasmiy PDF sertifikatni yuklab olish</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                /* REVOKED CERTIFICATE CARD */
                <div className="bg-white rounded-2xl border-2 border-rose-500 shadow-xl overflow-hidden">
                  <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-rose-950 uppercase tracking-wide">
                        Sertifikat bekor qilingan (Revoked)
                      </h3>
                      <p className="text-xs text-rose-800">
                        Ushbu sertifikat tahririyat tomonidan bekor qilingan va yaroqsiz deb topilgan.
                      </p>
                    </div>
                  </div>

                  <div className="p-6 space-y-4 text-xs sm:text-sm">
                    <p><strong>Sertifikat raqami:</strong> {cert.certificate_number}</p>
                    <p><strong>Muallif:</strong> {cert.author_name}</p>
                    <p><strong>Bekor qilinish sababi:</strong> {cert.revoked_reason || 'Tahririyat talablari buzilganligi munosabati bilan bekor qilingan'}</p>
                  </div>
                </div>
              )
            ) : (
              /* NOT FOUND CARD */
              <div className="bg-white rounded-2xl border-2 border-gold-300 shadow-xl p-8 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-gold-700 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  Sertifikat topilmadi
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  &ldquo;{code}&rdquo; raqamli sertifikat bazada mavjud emas. Iltimos, raqam to‘g‘ri kiritilganligini qayta tekshirib ko‘ring.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
