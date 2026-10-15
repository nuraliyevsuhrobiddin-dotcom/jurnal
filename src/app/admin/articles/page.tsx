'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Article, ArticleStatus } from '@/types/journal';
import { PlusCircle, Search, ExternalLink, Award, Trash2 } from 'lucide-react';

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const requestSequence = useRef(0);
  const [refresh, setRefresh] = useState(0);

  const handleDeleteArticle = async (article: Article) => {
    if (!window.confirm(`"${article.title_uz}" maqolasini butunlay o‘chirmoqchimisiz?`)) return;
    setActionLoading(article.id);
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'O‘chirib bo‘lmadi');
      }
      await loadArticles();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'O‘chirishda xatolik');
    } finally {
      setActionLoading(null);
    }
  };

  const loadArticles = () => setRefresh(value => value + 1);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      const values = new URLSearchParams({ page: String(page), q: search, status: statusFilter });
      fetch(`/api/admin/articles?${values}`)
        .then(async response => { if (!response.ok) throw new Error('Maqolalar yuklanmadi.'); return response.json(); })
        .then(data => { if (active && sequence === requestSequence.current) { setArticles(data.articles); setTotal(data.total); setError(''); } })
        .catch(error => { if (active && sequence === requestSequence.current) setError(error.message); })
        .finally(() => { if (active && sequence === requestSequence.current) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [page, search, statusFilter, refresh]);

  const handleStatusChange = async (articleId: string, newStatus: ArticleStatus) => {
    setActionLoading(articleId);
    try {
      const res = await fetch(`/api/admin/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_status', status: newStatus }),
      });
      if (res.ok) {
        await loadArticles();
      } else { const body = await res.json(); throw new Error(body.error || 'Holatni saqlab bo‘lmadi.'); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Holatni saqlab bo‘lmadi.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateCertificate = async (article: Article) => {
    if (!confirm(`"${article.title_uz}" maqolasi mualliflari uchun rasmiy sertifikat yaratilsinmi?`)) return;

    setActionLoading(article.id);
    try {
      const authors = article.authors || [];
      if (!authors.length) throw new Error('Maqolada mualliflar yo‘q.');
      for (const author of authors) {
      const res = await fetch('/api/admin/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: article.id,
          author_name: author?.full_name || 'Muallif',
          author_affiliation: author?.affiliation || '',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sertifikat yaratishda xatolik yuz berdi');
      }
      }
      alert(`${authors.length} ta muallif uchun sertifikat tayyorlandi.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sertifikat yaratilmadi.');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = articles;

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="p-4 rounded-lg bg-red-50 text-red-800">{error}</p>}
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl academic-border academic-shadow">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">
            Maqolalarni boshqarish
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Jami maqolalar: <strong>{articles.length} ta</strong> • Statuslar, ekspertiza va sertifikatlar
          </p>
        </div>

        <Link
          href="/admin/articles/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4 text-gold-400" />
          <span>Yangi maqola qo‘shish</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl academic-border academic-shadow flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 flex items-center bg-slate-50 rounded-lg border border-slate-200 px-3">
          <Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Maqola nomi yoki muallif bo‘yicha qidirish..."
            className="w-full py-2 bg-transparent text-xs sm:text-sm text-slate-900 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-50 border border-slate-200 text-xs sm:text-sm rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
        >
          <option value="">Barcha holatlar (Status)</option>
          <option value="draft">Draft (Qoralama)</option>
          <option value="under_review">Under Review (Tekshiruvda)</option>
          <option value="approved">Approved (Tasdiqlangan)</option>
          <option value="published">Published (Nashr qilingan)</option>
          <option value="withdrawn">Withdrawn (Qaytarib olingan)</option>
          <option value="archived">Archived (Arxivlangan)</option>
        </select>
      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-2xl academic-border academic-shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Maqolalar ro‘yxati yuklanmoqda...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Mos keluvchi maqolalar topilmadi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-navy-900 text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Maqola nomi va mualliflar</th>
                  <th className="py-3.5 px-4 font-semibold">Jild / Son</th>
                  <th className="py-3.5 px-4 font-semibold">Holati (Status)</th>
                  <th className="py-3.5 px-4 font-semibold">Statistika</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(article => (
                  <tr key={article.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 max-w-md">
                      <div className="font-bold text-navy-900 line-clamp-2">
                        {article.title_uz}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {(article.authors || []).map(a => a.full_name).join(', ') || 'Muallif ko‘rsatilmagan'}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs whitespace-nowrap text-slate-600">
                      {article.issue ? (
                        <span>Vol. {article.issue.volume}, No. {article.issue.issue_number} ({article.issue.year})</span>
                      ) : (
                        <span className="text-slate-500 italic">Son biriktirilmagan</span>
                      )}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        article.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                        article.status === 'approved' ? 'bg-teal-100 text-teal-800' :
                        article.status === 'under_review' ? 'bg-gold-100 text-gold-800' :
                        article.status === 'withdrawn' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {article.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                      <div>Ko‘rishlar: {article.views_count}</div>
                      <div>Yuklab olishlar: {article.downloads_count}</div>
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/admin/articles/${article.id}/edit`} className="px-2 py-1 text-xs font-semibold text-navy-900 underline">Tahrirlash</Link>
                        {article.manuscript_file_url && <a href={article.manuscript_file_url} className="px-2 py-1 text-xs font-semibold text-navy-900 underline" title="Yuborilgan qo‘lyozmani yuklab olish">Qo‘lyozma ↓</a>}
                        {/* Status transition buttons */}
                        {article.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(article.id, 'under_review')}
                            disabled={actionLoading === article.id}
                            className="px-2.5 py-1 rounded bg-gold-50 text-gold-800 hover:bg-gold-100 font-semibold text-xs border border-gold-200"
                          >
                            Tekshiruvga
                          </button>
                        )}

                        {article.status === 'under_review' && (
                          <button
                            onClick={() => handleStatusChange(article.id, 'approved')}
                            disabled={actionLoading === article.id}
                            className="px-2.5 py-1 rounded bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold text-xs border border-teal-200"
                          >
                            Tasdiqlash
                          </button>
                        )}

                        {article.status === 'approved' && (
                          <button
                            onClick={() => handleStatusChange(article.id, 'published')}
                            disabled={actionLoading === article.id}
                            className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs shadow-sm"
                          >
                            Nashr qilish
                          </button>
                        )}

                        {article.status === 'published' && (
                          <>
                            <button
                              onClick={() => handleGenerateCertificate(article)}
                              title="Mualliflik sertifikatini chiqarish"
                              className="p-1.5 rounded text-gold-700 hover:bg-gold-50"
                            >
                              <Award className="w-4 h-4" />
                            </button>
                            <Link
                              href={`/uz/article/${article.slug}`}
                              target="_blank"
                              title="Ommaviy sahifani ko‘rish"
                              className="p-1.5 rounded text-slate-500 hover:text-slate-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteArticle(article)}
                          disabled={actionLoading === article.id}
                          title="Maqolani butunlay o‘chirish"
                          className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
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
      <nav aria-label="Maqola sahifalari" className="flex justify-between items-center gap-4 text-sm">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">← Oldingi</button>
        <span>{page} / {Math.max(1, Math.ceil(total / 20))} · {total} maqola</span>
        <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Keyingi →</button>
      </nav>
    </div>
  );
}
