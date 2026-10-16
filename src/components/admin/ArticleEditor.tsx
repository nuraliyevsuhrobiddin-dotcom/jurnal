'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusCircle,
  Trash2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { Article, Issue, Language } from '@/types/journal';
import { MAX_UPLOAD_BYTES } from '@/lib/upload-limits';

interface AuthorInput {
  id: string;
  article_id: string;
  full_name: string;
  email: string;
  affiliation: string;
  country: string;
  orcid: string;
  is_corresponding: boolean;
  order_index: number;
}

export function ArticleEditor({ initialArticle }: { initialArticle?: Article }) {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [docxParsing, setDocxParsing] = useState(false);
  const [savedArticleId, setSavedArticleId] = useState(initialArticle?.id || '');
  const [publicationFile, setPublicationFile] = useState<File | null>(null);
  const [pdfReady, setPdfReady] = useState(Boolean(initialArticle?.pdf_url));
  const [preparedPdfUrl, setPreparedPdfUrl] = useState(initialArticle?.pdf_url ? `/api/admin/articles/${initialArticle.id}/pdf` : '');

  // Form states
  const [titleUz, setTitleUz] = useState(initialArticle?.title_uz || '');
  const [titleEn, setTitleEn] = useState(initialArticle?.title_en || '');
  const [titleRu, setTitleRu] = useState(initialArticle?.title_ru || '');
  const [abstractUz, setAbstractUz] = useState(initialArticle?.abstract_uz || '');
  const [abstractEn, setAbstractEn] = useState(initialArticle?.abstract_en || '');
  const [abstractRu, setAbstractRu] = useState(initialArticle?.abstract_ru || '');
  const [keywordsUz, setKeywordsUz] = useState((initialArticle?.keywords_uz || []).join(', '));
  const [keywordsEn, setKeywordsEn] = useState((initialArticle?.keywords_en || []).join(', '));
  const [keywordsRu, setKeywordsRu] = useState((initialArticle?.keywords_ru || []).join(', '));
  const [originalLanguage, setOriginalLanguage] = useState<Language>(initialArticle?.original_language || 'uz');
  const [articleType, setArticleType] = useState(initialArticle?.article_type || 'original_research');
  const [status, setStatus] = useState(initialArticle?.status || 'draft');
  const [issueId, setIssueId] = useState(initialArticle?.issue_id || '');
  const [pageFirst, setPageFirst] = useState(initialArticle ? String(initialArticle.page_first ?? '') : '1');
  const [pageLast, setPageLast] = useState(initialArticle ? String(initialArticle.page_last ?? '') : '10');
  const [doi, setDoi] = useState(initialArticle?.doi || '');
  const [doiCheck, setDoiCheck] = useState('');
  const [checkingDoi, setCheckingDoi] = useState(false);
  async function checkDoi() {
    setCheckingDoi(true); setDoiCheck('');
    try {
      const response = await fetch(`/api/admin/doi?doi=${encodeURIComponent(doi)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Tekshiruv bajarilmadi.');
      setDoiCheck(result.active ? 'DOI reyestrda faol. Manzil va maqola mosligini ham tekshiring.' : result.status === 'not_registered' ? 'DOI ro‘yxatdan o‘tmagan. Avval DOI xizmatida ro‘yxatdan o‘tkazing.' : result.status === 'invalid' ? 'DOI formati noto‘g‘ri.' : 'DOI xizmatiga ulanish tekshirilmadi. Keyinroq urinib ko‘ring.');
    } catch (error) { setDoiCheck(error instanceof Error ? error.message : 'Tekshirilmadi.'); }
    finally { setCheckingDoi(false); }
  }
  const [references, setReferences] = useState((initialArticle?.references_list || []).join('\n'));
  const [publicationDate, setPublicationDate] = useState(initialArticle?.publication_date?.slice(0, 10) || '');
  const [license, setLicense] = useState(initialArticle?.license || 'CC BY 4.0');

  // Authors dynamic array
  const [authors, setAuthors] = useState<AuthorInput[]>(initialArticle?.authors?.length ? initialArticle.authors.map((author, index) => ({ ...author, id: author.id || `auth-${index + 1}`, article_id: author.article_id || initialArticle.id, email: author.email || '', orcid: author.orcid || '' })) : [
    {
      id: 'auth-1',
      article_id: '',
      full_name: '',
      email: '',
      affiliation: '',
      country: 'O‘zbekiston',
      orcid: '',
      is_corresponding: true,
      order_index: 1,
    }
  ]);

  useEffect(() => {
    fetch('/api/admin/issues')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setIssues(data);
          if (!initialArticle && data.length > 0) setIssueId((data.find(issue => issue.is_current) || data[0]).id);
        }
      })
      .catch(console.error);
  }, [initialArticle]);

  const addAuthor = () => {
    setAuthors([
      ...authors,
      {
        id: `auth-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        article_id: '',
        full_name: '',
        email: '',
        affiliation: '',
        country: 'O‘zbekiston',
        orcid: '',
        is_corresponding: false,
        order_index: authors.length + 1,
      }
    ]);
  };

  const removeAuthor = (index: number) => {
    if (authors.length <= 1) return;
    setAuthors(authors.filter((_, i) => i !== index));
  };

  const updateAuthor = <K extends keyof AuthorInput>(index: number, field: K, value: AuthorInput[K]) => {
    const updated = [...authors];
    updated[index] = { ...updated[index], [field]: value };
    setAuthors(updated);
  };

  // Upload and parse DOCX file to auto-populate metadata
  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES || !/\.(pdf|docx)$/i.test(file.name)) { setErrorMsg('4 MB gacha to‘liq maqola PDF yoki DOCX faylini tanlang.'); return; }
    setPublicationFile(file);
    if (/\.pdf$/i.test(file.name)) { setSuccessMsg('To‘liq maqola PDF’i tanlandi. Maydonlarni to‘ldirib saqlang.'); return; }

    setDocxParsing(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/docx/parse', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'DOCX tahlil qilishda xatolik');
      }

      // Auto-populate extracted data
      if (data.extractedTitle && !titleUz) {
        setTitleUz(data.extractedTitle);
      }
      if (data.extractedAbstract && !abstractUz) {
        setAbstractUz(data.extractedAbstract);
      }
      if (data.extractedKeywords && data.extractedKeywords.length > 0 && !keywordsUz) {
        setKeywordsUz(data.extractedKeywords.join(', '));
      }
      if (data.extractedReferences && data.extractedReferences.length > 0 && !references) {
        setReferences(data.extractedReferences.join('\n'));
      }

      setSuccessMsg(`DOCX tanlandi va maydonlar to‘ldirildi (${data.wordCount} so‘z). Saqlashda to‘liq matn PDF’ga tayyorlanadi.`);
    } catch (err: unknown) {
      setErrorMsg((err instanceof Error ? err.message : null) || 'DOCX faylni o‘qib bo‘lmadi');
    } finally {
      setDocxParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation checks
    if (!titleUz.trim()) {
      setErrorMsg('O‘zbekcha sarlavha kiritilishi shart');
      setLoading(false);
      return;
    }

    if (!abstractUz.trim()) {
      setErrorMsg('O‘zbekcha annotatsiya kiritilishi shart');
      setLoading(false);
      return;
    }

    if (authors.some(a => !a.full_name.trim() || !a.affiliation.trim())) {
      setErrorMsg('Barcha mualliflarning ism-sharifi va tashkiloti to‘ldirilishi shart');
      setLoading(false);
      return;
    }

    const payload = {
      ...(initialArticle ? { clear_fields: Object.entries({ issue_id: issueId, page_first: pageFirst, page_last: pageLast, doi, publication_date: publicationDate, title_en: titleEn, title_ru: titleRu, abstract_en: abstractEn, abstract_ru: abstractRu }).filter(([, value]) => !value.trim()).map(([field]) => field) } : {}),
      title_uz: titleUz.trim(),
      title_en: titleEn.trim() || undefined,
      title_ru: titleRu.trim() || undefined,
      abstract_uz: abstractUz.trim(),
      abstract_en: abstractEn.trim() || undefined,
      abstract_ru: abstractRu.trim() || undefined,
      keywords_uz: keywordsUz.split(',').map(k => k.trim()).filter(Boolean),
      keywords_en: keywordsEn ? keywordsEn.split(',').map(k => k.trim()).filter(Boolean) : [],
      keywords_ru: keywordsRu ? keywordsRu.split(',').map(k => k.trim()).filter(Boolean) : [],
      original_language: originalLanguage,
      article_type: articleType,
      status: publicationFile || (!pdfReady && initialArticle?.manuscript_file_url) || (!savedArticleId && status === 'published') ? 'draft' : status,
      issue_id: issueId || undefined,
      page_first: pageFirst ? parseInt(pageFirst) : undefined,
      page_last: pageLast ? parseInt(pageLast) : undefined,
      doi: doi.trim() || undefined,
      license: license.trim(),
      publication_date: publicationDate || undefined,
      references_list: references.split('\n').map(r => r.trim()).filter(Boolean),
      authors: authors.map((a, idx) => ({
        ...a,
        order_index: idx + 1,
      })),
    };

    try {
      const res = await fetch(savedArticleId ? `/api/admin/articles/${savedArticleId}` : '/api/admin/articles', {
        method: savedArticleId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Maqolani saqlashda xatolik yuz berdi');
      }
      setSavedArticleId(data.id);
      let ready = pdfReady;
      if (publicationFile || (!pdfReady && initialArticle?.manuscript_file_url)) {
        const form = new FormData();
        if (publicationFile) form.set('file', publicationFile); else form.set('use_manuscript', 'true');
        const upload = await fetch(`/api/admin/articles/${data.id}/pdf`, { method: 'POST', body: form });
        const uploaded = await upload.json();
        if (!upload.ok) throw new Error(`Qoralama saqlandi. ${uploaded.error || 'To‘liq fayl tayyorlanmadi.'}`);
        ready = true; setPdfReady(true); setPublicationFile(null); setPreparedPdfUrl(uploaded.url);
        setPageFirst(String(uploaded.page_first)); setPageLast(String(uploaded.page_last));
      }
      if (status === 'published' && data.status !== 'published') {
        if (!ready) throw new Error('Qoralama saqlandi. Nashr qilish uchun shu oynada to‘liq maqola faylini tanlang.');
        const publish = await fetch(`/api/admin/articles/${data.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'change_status', status: 'published' }) });
        const published = await publish.json();
        if (!publish.ok) throw new Error(published.error || 'Nashr qilib bo‘lmadi.');
      }
      setSuccessMsg(ready ? 'Maqola va to‘liq fayl saqlandi. PDF’ni quyidagi havoladan tekshiring.' : 'Qoralama saqlandi. To‘liq maqola faylini shu oynada tanlashingiz mumkin.');
      router.refresh();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setErrorMsg((err instanceof Error ? err.message : null) || 'Xatolik yuz berdi');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ortga qaytish</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
            {initialArticle ? 'Ilmiy maqolani tahrirlash' : 'Yangi ilmiy maqola kiritish'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            To‘liq maqola fayli, mualliflar va nashr ma’lumotlarini shu oynada saqlang.
          </p>
        </div>
      </div>

      {initialArticle?.manuscript_file_url && <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm space-y-2"><a href={initialArticle.manuscript_file_url} className="font-semibold text-navy-900 underline">Yuborilgan qo‘lyozmani yuklab olish ↓</a>{initialArticle.submission_notes && <p className="text-xs text-slate-600 whitespace-pre-wrap">{initialArticle.submission_notes}</p>}</div>}

      {/* Instant DOCX parsing card */}
      <div className="bg-gradient-to-r from-teal-50 to-teal-50 border border-teal-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-700" />
              <span>To‘liq maqola fayli — PDF yoki DOCX</span>
            </h3>
            <p className="text-xs text-slate-600">
              Faylni tanlang va pastdagi saqlash tugmasini bosing. PDF barcha sahifalari bilan saqlanadi. Oddiy DOCX to‘liq matndan PDF’ga aylantiriladi; jadval, rasm va formulali hujjatni Word’dan PDF qilib yuklang.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold cursor-pointer transition-colors shrink-0 shadow-sm">
            <UploadCloud className="w-4 h-4 text-gold-400" />
            <span>{docxParsing ? 'Tahlil qilinmoqda...' : 'Maqola faylini tanlash'}</span>
            <input
              type="file"
              accept=".pdf,.docx"
              disabled={docxParsing || loading}
              onChange={handleDocxUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-2">
        <p>{publicationFile ? `Tanlangan fayl: ${publicationFile.name}` : pdfReady ? 'To‘liq maqola PDF’i saqlangan.' : initialArticle?.manuscript_file_url ? 'Yuborilgan qo‘lyozma saqlash vaqtida ishlatiladi.' : 'To‘liq maqola fayli hali tanlanmagan.'}</p>
        {preparedPdfUrl && <a href={preparedPdfUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-800 underline">To‘liq maqola PDF’ini ochish</a>}
      </div>
      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Creation Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: TITLES (UZ, EN, RU) */}
        <div className="bg-white rounded-2xl academic-border academic-shadow p-6 sm:p-8 space-y-5">
          <h2 className="text-base font-bold text-navy-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gold-700" />
            <span>1. Maqola sarlavhalari (3 tilda)</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sarlavha (O‘zbekcha) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={titleUz}
                onChange={e => setTitleUz(e.target.value)}
                placeholder="Masalan: Sun‘iy intellekt yordamida makroiqtisodiy jarayonlarni modellashtirish..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sarlavha (Inglizcha / English)
                </label>
                <input
                  type="text"
                  value={titleEn}
                  onChange={e => setTitleEn(e.target.value)}
                  placeholder="Methods of Modeling and Forecasting..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sarlavha (Ruscha / Русский)
                </label>
                <input
                  type="text"
                  value={titleRu}
                  onChange={e => setTitleRu(e.target.value)}
                  placeholder="Методы моделирования и прогнозирования..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: AUTHORS LIST (DYNAMIC) */}
        <div className="bg-white rounded-2xl academic-border academic-shadow p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-navy-900">
                2. Mualliflar ro‘yxati (Cheklanmagan)
              </h2>
              <p className="text-xs text-slate-500">
                Har bir muallif uchun tashkilot, mamlakat va ORCID kiritiladi
              </p>
            </div>
            <button
              type="button"
              onClick={addAuthor}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Muallif qo‘shish</span>
            </button>
          </div>

          <div className="space-y-4">
            {authors.map((author, index) => (
              <div
                key={author.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-900 bg-white px-2 py-0.5 rounded border">
                    Muallif #{index + 1}
                  </span>
                  {authors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAuthor(index)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      F.I.Sh. (To‘liq ism) *
                    </label>
                    <input
                      type="text"
                      required
                      value={author.full_name}
                      onChange={e => updateAuthor(index, 'full_name', e.target.value)}
                      placeholder="Prof. Alisher Qodirov"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ish/o‘qish joyi (Tashkilot) *
                    </label>
                    <input
                      type="text"
                      required
                      value={author.affiliation}
                      onChange={e => updateAuthor(index, 'affiliation', e.target.value)}
                      placeholder="Toshkent axborot texnologiyalari universiteti"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Mamlakat *
                    </label>
                    <input
                      type="text"
                      required
                      value={author.country}
                      onChange={e => updateAuthor(index, 'country', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      E-mail (ixtiyoriy)
                    </label>
                    <input
                      type="email"
                      value={author.email}
                      onChange={e => updateAuthor(index, 'email', e.target.value)}
                      placeholder="author@univ.uz"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ORCID ID (ixtiyoriy)
                    </label>
                    <input
                      type="text"
                      value={author.orcid}
                      onChange={e => updateAuthor(index, 'orcid', e.target.value)}
                      placeholder="0000-0002-1825-0097"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-navy-900"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id={`corr-${index}`}
                      checked={author.is_corresponding}
                      onChange={e => updateAuthor(index, 'is_corresponding', e.target.checked)}
                      className="rounded text-navy-900 focus:ring-navy-900"
                    />
                    <label htmlFor={`corr-${index}`} className="text-xs text-slate-700 font-medium cursor-pointer">
                      Mas’ul muallif (Corresponding)
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: ABSTRACTS & KEYWORDS */}
        <div className="bg-white rounded-2xl academic-border academic-shadow p-6 sm:p-8 space-y-5">
          <h2 className="text-base font-bold text-navy-900 border-b border-slate-100 pb-3">
            3. Annotatsiya va kalit so‘zlar (3 tilda)
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Annotatsiya (O‘zbekcha) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={abstractUz}
                onChange={e => setAbstractUz(e.target.value)}
                placeholder="Maqolaning maqsadi, uslubiyati va asosiy xulosalari..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kalit so‘zlar (O‘zbekcha, vergul bilan ajrating) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={keywordsUz}
                onChange={e => setKeywordsUz(e.target.value)}
                placeholder="sun‘iy intellekt, makroiqtisodiyot, mashinali o‘rganish, ekonometriya"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label htmlFor="keywords-en" className="block text-xs font-bold text-slate-700 mb-1">Kalit so‘zlar (English)</label><input id="keywords-en" value={keywordsEn} onChange={event => setKeywordsEn(event.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300" placeholder="research, science" /></div>
              <div><label htmlFor="keywords-ru" className="block text-xs font-bold text-slate-700 mb-1">Kalit so‘zlar (Русский)</label><input id="keywords-ru" value={keywordsRu} onChange={event => setKeywordsRu(event.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300" placeholder="исследования, наука" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Annotatsiya (Inglizcha / English)
                </label>
                <textarea
                  rows={3}
                  value={abstractEn}
                  onChange={e => setAbstractEn(e.target.value)}
                  placeholder="Abstract in English..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-navy-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Annotatsiya (Ruscha / Русский)
                </label>
                <textarea
                  rows={3}
                  value={abstractRu}
                  onChange={e => setAbstractRu(e.target.value)}
                  placeholder="Аннотация на русском..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-navy-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: PUBLICATION & ISSUE METADATA */}
        <div className="bg-white rounded-2xl academic-border academic-shadow p-6 sm:p-8 space-y-5">
          <h2 className="text-base font-bold text-navy-900 border-b border-slate-100 pb-3">
            4. Nashr metama’lumotlari va jild/son
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jurnal soni (Issue)
              </label>
              <select
                value={issueId}
                onChange={e => setIssueId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
              >
                <option value="">Son belgilanmagan</option>
                {issues.map(iss => (
                  <option key={iss.id} value={iss.id}>
                    Vol. {iss.volume}, No. {iss.issue_number} ({iss.year})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Asl tili
              </label>
              <select
                value={originalLanguage}
                onChange={e => setOriginalLanguage(e.target.value as Language)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
              >
                <option value="uz">O‘zbekcha (uz)</option>
                <option value="en">Inglizcha (en)</option>
                <option value="ru">Ruscha (ru)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Maqola turi
              </label>
              <select
                value={articleType}
                onChange={e => setArticleType(e.target.value as Article['article_type'])}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
              >
                <option value="original_research">Original tadqiqot</option>
                <option value="review">Sharh (Review)</option>
                <option value="short_communication">Qisqa xabar</option>
                <option value="case_study">Keys tadqiqot</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dastlabki holat (Status)
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Article['status'])}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
              >
                <option value="draft">Draft (Qoralama)</option>
                <option value="under_review">Under Review (Tekshiruvda)</option>
                <option value="approved">Approved (Tasdiqlangan)</option>
                <option value="published">Published (Nashr qilingan)</option><option value="rejected">Rejected</option><option value="withdrawn">Withdrawn</option><option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Boshlang‘ich sahifa
              </label>
              <input
                type="number"
                value={pageFirst}
                onChange={e => setPageFirst(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tugash sahifasi
              </label>
              <input
                type="number"
                value={pageLast}
                onChange={e => setPageLast(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                DOI identifikatori (mavjud bo‘lsa)
              </label>
              <input
                type="text"
                value={doi}
                onChange={e => { setDoi(e.target.value); setDoiCheck(''); }}
                placeholder="10.xxxx/registered-identifier"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-900"
              />
              <p className="mt-2 text-xs text-slate-500">Only enter a DOI already registered by your DOI provider. Saving a number here does not register it.</p>
              <button type="button" disabled={!doi.trim() || checkingDoi} onClick={checkDoi} className="mt-2 text-xs text-teal-800 underline disabled:opacity-50">{checkingDoi ? 'Checking...' : 'Verify DOI registration'}</button>
              <p role="status" className="mt-1 text-xs">{doiCheck}</p>

            </div>
            <div><label htmlFor="publication-date" className="block text-xs font-bold text-slate-700 mb-1">Nashr sanasi</label><input id="publication-date" type="date" value={publicationDate} onChange={event => setPublicationDate(event.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900" /></div>
            <div><label htmlFor="article-license" className="block text-xs font-bold text-slate-700 mb-1">Litsenziya</label><input id="article-license" required value={license} onChange={event => setLicense(event.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy-900" /></div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Foydalanilgan adabiyotlar (Har bir manba yangi qatordan)
            </label>
            <textarea
              rows={4}
              value={references}
              onChange={e => setReferences(e.target.value)}
              placeholder="1. Vaswani, A., et al. (2017). Attention is all you need...&#10;2. Box, G. E., Jenkins, G. M. (2015)..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-navy-900"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Bekor qilish
          </button>

          <button
            type="submit"
            disabled={loading || docxParsing}
            className="px-8 py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-102 disabled:opacity-50"
          >
            {loading ? 'Saqlanmoqda...' : 'Maqolani saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}
