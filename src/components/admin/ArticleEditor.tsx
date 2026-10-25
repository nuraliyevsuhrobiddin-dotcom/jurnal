'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { applyManuscriptSuggestions, clearAutomaticFields, editManuscriptField, emptyManuscriptFields, type TrackedFields } from '@/lib/manuscript-fields';
import { MAX_UPLOAD_BYTES } from '@/lib/upload-limits';
import { subjectCollections, resolveSubjectId, subjectLabel } from '@/lib/subjects';

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
  const [regenerateFromManuscript, setRegenerateFromManuscript] = useState(false);
  const [pdfReady, setPdfReady] = useState(Boolean(initialArticle?.pdf_url));
  const [subjectId, setSubjectId] = useState(initialArticle?.subject_id || 'auto');
  const [preparedPdfUrl, setPreparedPdfUrl] = useState(initialArticle?.pdf_url ? `/api/admin/articles/${initialArticle.id}/pdf` : '');

  // Form states
  const [manuscriptLanguage, setManuscriptLanguage] = useState<Language>(initialArticle?.original_language || 'uz');
  const initialLanguage = initialArticle?.original_language || 'uz';
  const [tracked, setTracked] = useState<TrackedFields>({ values: { ...emptyManuscriptFields, title: initialArticle?.[`title_${initialLanguage}`] || initialArticle?.title_uz || '', abstract: initialArticle?.[`abstract_${initialLanguage}`] || initialArticle?.abstract_uz || '', keywords: (initialArticle?.[`keywords_${initialLanguage}`] || initialArticle?.keywords_uz || []).join(', ') }, automatic: {}, edited: {} });
  const title = tracked.values.title, abstract = tracked.values.abstract, keywords = tracked.values.keywords;
  const automaticAuthor = useRef<Partial<AuthorInput>>({});
  const authorEdited = useRef(new Set<string>());
  const automaticReferences = useRef<string | null>(null);
  const referencesEdited = useRef(false);
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
      country: '',
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
        country: '',
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
    if (index === 0) { delete automaticAuthor.current[field]; authorEdited.current.add(field); }
    const updated = [...authors];
    updated[index] = { ...updated[index], [field]: value };
    setAuthors(updated);
  };

  // Upload and parse DOCX file to auto-populate metadata
  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setTracked(clearAutomaticFields);
    const previousAuthor = automaticAuthor.current;
    setAuthors(current => current.map((author, index) => index ? author : {
      ...author,
      ...Object.fromEntries(Object.entries(previousAuthor).filter(([key, value]) => author[key as keyof AuthorInput] === value).map(([key]) => [key, ''])),
    }));
    automaticAuthor.current = {};
    const previousReferences = automaticReferences.current;
    setReferences(current => current === previousReferences ? '' : current);
    automaticReferences.current = null;
    setErrorMsg(null);
    setSuccessMsg(null);
    setPublicationFile(null);
    setRegenerateFromManuscript(false);
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
      if (data.language?.status === 'non_english') throw new Error(data.language.message);

      if (data.metadata) {
        const suggestions = { full_name: data.metadata.author_name, email: data.metadata.email, affiliation: data.metadata.affiliation, country: data.metadata.country };
        setAuthors(current => current.map((author, index) => {
          if (index) return author;
          const updated = { ...author };
          for (const key of ['full_name', 'email', 'affiliation', 'country'] as const) {
            if (!author[key] && !authorEdited.current.has(key) && suggestions[key]) {
              updated[key] = suggestions[key]; automaticAuthor.current[key] = suggestions[key];
            }
          }
          return updated;
        }));
        setTracked(current => applyManuscriptSuggestions(current, data.metadata));
      }
      if (data.extractedReferences?.length) {
        setReferences(current => {
          if (current || referencesEdited.current) return current;
          automaticReferences.current = data.extractedReferences.join('\n');
          return automaticReferences.current!;
        });
      }
      const found = data.report?.found?.join(', ') || 'none';
      const missing = data.report?.missing?.join(', ') || 'none';
      setSuccessMsg(`Word file read. Detected: ${found}. Not detected: ${missing}. Review all values and complete missing fields. ${data.language?.message || ''}`);
    } catch (err: unknown) {
      setPublicationFile(null);
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
    if (!title.trim()) {
      setErrorMsg('Maqola sarlavhasi kiritilishi shart');
      setLoading(false);
      return;
    }

    if (!abstract.trim()) {
      setErrorMsg('Maqola annotatsiyasi kiritilishi shart');
      setLoading(false);
      return;
    }

    if (authors.some(a => !a.full_name.trim() || !a.affiliation.trim())) {
      setErrorMsg('Barcha mualliflarning ism-sharifi va tashkiloti to‘ldirilishi shart');
      setLoading(false);
      return;
    }

    const payload = {
      ...(initialArticle ? { clear_fields: Object.entries({ issue_id: issueId, page_first: pageFirst, page_last: pageLast, doi, publication_date: publicationDate }).filter(([, value]) => !value.trim()).map(([field]) => field) } : {}),
      title_uz: manuscriptLanguage === 'uz' ? title.trim() : initialArticle?.title_uz || title.trim(),
      abstract_uz: manuscriptLanguage === 'uz' ? abstract.trim() : initialArticle?.abstract_uz || abstract.trim(),
      keywords_uz: manuscriptLanguage === 'uz' ? keywords.split(',').map(k => k.trim()).filter(Boolean) : initialArticle?.keywords_uz || keywords.split(',').map(k => k.trim()).filter(Boolean),
      title_en: initialArticle?.title_en,
      abstract_en: initialArticle?.abstract_en,
      keywords_en: initialArticle?.keywords_en || [],
      title_ru: initialArticle?.title_ru,
      abstract_ru: initialArticle?.abstract_ru,
      keywords_ru: initialArticle?.keywords_ru || [],
      [`title_${manuscriptLanguage}`]: title.trim(),
      [`abstract_${manuscriptLanguage}`]: abstract.trim(),
      [`keywords_${manuscriptLanguage}`]: keywords.split(',').map(k => k.trim()).filter(Boolean),
      original_language: manuscriptLanguage,
      article_type: articleType,
      status: publicationFile || regenerateFromManuscript || (!pdfReady && initialArticle?.manuscript_file_url) || (!savedArticleId && status === 'published') ? 'draft' : status,
      issue_id: issueId || undefined,
      subject_id: subjectId,
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
      let notificationWarning = data.notification_warning;
      let ready = pdfReady;
      if (publicationFile || regenerateFromManuscript || (!pdfReady && initialArticle?.manuscript_file_url)) {
        const form = new FormData();
        if (publicationFile) form.set('file', publicationFile); else form.set('use_manuscript', 'true');
        const upload = await fetch(`/api/admin/articles/${data.id}/pdf`, { method: 'POST', body: form });
        const uploaded = await upload.json();
        if (!upload.ok) throw new Error(`Qoralama saqlandi. ${uploaded.error || 'To‘liq fayl tayyorlanmadi.'}`);
        ready = true; setPdfReady(true); setPublicationFile(null); setPreparedPdfUrl(uploaded.url);
        setRegenerateFromManuscript(false);
        setPageFirst(String(uploaded.page_first)); setPageLast(String(uploaded.page_last));
      }
      if (status === 'published' && data.status !== 'published') {
        if (!ready) throw new Error('Qoralama saqlandi. Nashr qilish uchun shu oynada to‘liq maqola faylini tanlang.');
        const publish = await fetch(`/api/admin/articles/${data.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'change_status', status: 'published' }) });
        const published = await publish.json();
        if (!publish.ok) throw new Error(published.error || 'Nashr qilib bo‘lmadi.');
        notificationWarning = published.notification_warning || notificationWarning;
      }
      setSuccessMsg(ready ? 'Maqola va to‘liq fayl saqlandi. PDF’ni quyidagi havoladan tekshiring.' : 'Qoralama saqlandi. To‘liq maqola faylini shu oynada tanlashingiz mumkin.');
      router.refresh();
      if (notificationWarning) setErrorMsg(notificationWarning);
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
              PDF sahifalariga jurnal shabloni qo‘llanadi. DOCX maqolalar jurnal maketida PDF qilinadi. Tayyor faylni nashrdan oldin tekshiring.
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
        {initialArticle?.manuscript_file_url && pdfReady && <label className="flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" checked={regenerateFromManuscript} onChange={event => { setRegenerateFromManuscript(event.target.checked); if (event.target.checked) setStatus('draft'); }} className="mt-0.5" /><span>Asl yuborilgan qo‘lyozmadan PDF’ni qayta tayyorla. Tekshiruv uchun maqola qoralama bo‘lib saqlanadi.</span></label>}
        {preparedPdfUrl && <a href={preparedPdfUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-800 underline">To‘liq maqola PDF’ini ochish</a>}
      </div>
      {/* Alerts */}
      {errorMsg && (
        <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div role="status" className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Creation Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="rounded-xl border border-teal-200 bg-teal-50 p-5 space-y-3">
          <label htmlFor="article-subject" className="block text-sm font-semibold text-navy-900">Fan yo‘nalishi va nashr muqovasi</label>
          <select id="article-subject" value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm">
            <option value="auto">Avtomatik — maqola mazmuniga qarab</option>
            {subjectCollections.map(subject => <option key={subject.id} value={subject.id}>{subject.labels.uz}</option>)}
          </select>
          <p className="text-sm text-slate-700">{subjectId === 'auto' ? `Aniqlangan yo‘nalish: ${subjectLabel(resolveSubjectId({ title_en: title, abstract_en: abstract, keywords_en: keywords.split(',') } as Article), 'uz')}.` : `Tanlangan yo‘nalish: ${subjectLabel(subjectId, 'uz')}.`} Nashrdan so‘ng maqola shu yo‘nalish sahifasida va uning muqovali to‘plamida ko‘rinadi.</p>
        </section>
        <section className="bg-white rounded-2xl academic-border academic-shadow p-6 sm:p-8 space-y-5">
          <h2 className="text-base font-bold text-navy-900 flex items-center gap-2"><FileText className="w-4 h-4" />1. Maqola nomi</h2>
          <label className="block text-sm">Maqola tili<select aria-label="Maqola tili" value={manuscriptLanguage} onChange={event => setManuscriptLanguage(event.target.value as Language)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="uz">O‘zbekcha</option><option value="ru">Русский</option><option value="en">English</option></select></label>
          <label className="block text-sm">Sarlavha *<input required minLength={5} maxLength={500} value={title} onChange={e => setTracked(current => editManuscriptField(current, 'title', e.target.value))} className="w-full px-3 py-2 rounded-xl border border-slate-300" /></label>
        </section>

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

        <section className="bg-white rounded-2xl academic-border academic-shadow p-6 sm:p-8 space-y-5">
          <h2 className="text-base font-bold text-navy-900">3. Annotatsiya va kalit so‘zlar</h2>
          <label className="block text-sm">Annotatsiya *<textarea required minLength={50} maxLength={10000} rows={6} value={abstract} onChange={e => setTracked(current => editManuscriptField(current, 'abstract', e.target.value))} className="w-full px-3 py-2 rounded-xl border border-slate-300" /></label>
          <label className="block text-sm">Kalit so‘zlar *<input required minLength={2} maxLength={1000} value={keywords} onChange={e => setTracked(current => editManuscriptField(current, 'keywords', e.target.value))} className="w-full px-3 py-2 rounded-xl border border-slate-300" /><small>Kalit so‘zlarni vergul bilan ajrating.</small></label>
        </section>

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
              <input value={{ uz: 'O‘zbekcha (uz)', ru: 'Русский (ru)', en: 'English (en)' }[manuscriptLanguage]} readOnly className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm" />
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
                disabled={regenerateFromManuscript}
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
              onChange={e => { automaticReferences.current = null; referencesEdited.current = true; setReferences(e.target.value); }}
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
