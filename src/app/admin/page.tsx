import React from 'react';
import Link from 'next/link';
import { getJournalStats, getAuditLogs, getAllArticlesAdmin } from '@/lib/db';
import { FileText, CheckCircle2, Clock, Award, BookMarked, AlertTriangle, PlusCircle, History, ShieldCheck } from 'lucide-react';

export default async function AdminDashboardPage() {
  const [stats, auditLogs, articles] = await Promise.all([
    getJournalStats(),
    getAuditLogs(),
    getAllArticlesAdmin(),
  ]);

  const recentArticles = articles.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl academic-border academic-shadow">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
            Boshqaruv paneli (Dashboard)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            AGM Journal ilmiy nashriyot platformasining umumiy holati va statistikalari
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/articles/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-gold-400" />
            <span>Maqola kiritish</span>
          </Link>
          <Link
            href="/admin/issues"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-slate-950 text-xs font-bold transition-colors shadow-sm"
          >
            <BookMarked className="w-4 h-4" />
            <span>Yangi son</span>
          </Link>
        </div>
      </div>

      {/* Real Statistics Grid (Section 8.1) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Published */}
        <div className="bg-white p-5 rounded-2xl academic-border academic-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">Nashr qilingan</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-navy-900">{stats.publishedArticles}</div>
          <p className="text-[11px] text-slate-500">Ommaviy saytda o‘qilmoqda</p>
        </div>

        {/* Under Review */}
        <div className="bg-white p-5 rounded-2xl academic-border academic-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gold-700 uppercase">Tekshiruvda</span>
            <Clock className="w-5 h-5 text-gold-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-navy-900">{stats.underReviewArticles}</div>
          <p className="text-[11px] text-slate-500">Taqriz jarayonidagi ishlar</p>
        </div>

        {/* Drafts */}
        <div className="bg-white p-5 rounded-2xl academic-border academic-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase">Qoralamalar (Draft)</span>
            <FileText className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-navy-900">{stats.draftArticles}</div>
          <p className="text-[11px] text-slate-500">Tahrirlanmoqda</p>
        </div>

        {/* Certificates */}
        <div className="bg-white p-5 rounded-2xl academic-border academic-shadow space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-700 uppercase">Sertifikatlar</span>
            <Award className="w-5 h-5 text-teal-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-navy-900">{stats.totalCertificates}</div>
          <p className="text-[11px] text-slate-500">QR tasdiqlangan hujjatlar</p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl academic-border academic-shadow flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Jurnal sonlari (Issues)</span>
            <div className="text-xl font-bold text-navy-900 mt-1">{stats.totalIssues} ta son</div>
          </div>
          <div className="p-3 bg-teal-50 rounded-xl text-teal-700">
            <BookMarked className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl academic-border academic-shadow flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Tasdiqlangan maqolalar</span>
            <div className="text-xl font-bold text-navy-900 mt-1">{stats.approvedArticles} ta maqola</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl academic-border academic-shadow flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Bekor qilingan sertifikatlar</span>
            <div className="text-xl font-bold text-rose-600 mt-1">{stats.revokedCertificates} ta bekor</div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Articles & Recent Audit Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Articles */}
        <div className="bg-white rounded-2xl academic-border academic-shadow p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-navy-900">
              So‘nggi maqolalar
            </h2>
            <Link
              href="/admin/articles"
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              Barchasini ko‘rish
            </Link>
          </div>

          <div className="space-y-3">
            {recentArticles.map((art) => (
              <div
                key={art.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 truncate">
                  <h4 className="font-bold text-navy-900 truncate">{art.title_uz}</h4>
                  <p className="text-slate-500 truncate">
                    Muallif: {art.authors?.[0]?.full_name || 'Noma‘lum'}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    art.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                    art.status === 'under_review' ? 'bg-gold-100 text-gold-800' :
                    art.status === 'approved' ? 'bg-teal-100 text-teal-800' :
                    'bg-slate-200 text-slate-800'
                  }`}>
                    {art.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="bg-white rounded-2xl academic-border academic-shadow p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
              <History className="w-4 h-4 text-gold-700" />
              <span>Audit va xavfsizlik jurnali</span>
            </h2>
            <Link
              href="/admin/audit-logs"
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              Barcha loglar
            </Link>
          </div>

          <div className="space-y-3">
            {auditLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-navy-900 font-mono text-[11px] block">
                    {log.action}
                  </span>
                  <p className="text-slate-500 text-[11px]">
                    {log.user_email} • {log.ip_address}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
