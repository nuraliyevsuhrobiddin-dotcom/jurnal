'use client';

import React, { useState } from 'react';
import { Article, Language } from '@/types/journal';
import { Copy, Check, Quote } from 'lucide-react';

interface CitationBoxProps {
  article: Article;
  lang?: Language;
}

export function CitationBox({ article, lang = 'uz' }: CitationBoxProps) {
  const [format, setFormat] = useState<'APA' | 'MLA' | 'Chicago' | 'BibTeX'>('APA');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const text = {
    uz: { cite: 'Iqtibos keltirish', copy: 'Iqtibosdan nusxa olish', copied: 'Nusxalandi!', error: 'Nusxa olish imkoni bo‘lmadi. Matnni tanlab nusxa oling.', undated: 'sana belgilanmagan' },
    en: { cite: 'How to cite', copy: 'Copy citation', copied: 'Copied!', error: 'Could not copy. Select the text and copy it manually.', undated: 'n.d.' },
    ru: { cite: 'Цитирование', copy: 'Копировать цитату', copied: 'Скопировано!', error: 'Не удалось скопировать. Выделите и скопируйте текст.', undated: 'дата не указана' },
  }[lang];
  const authorsStr = (article.authors || []).map(a => a.full_name).join(', ');
  const publicationYear = article.publication_date ? Number(article.publication_date.slice(0, 4)) : undefined;
  const year = article.issue?.year || (Number.isFinite(publicationYear) ? publicationYear : undefined);
  const yearText = year ? String(year) : text.undated;
  const pages = article.page_first != null ? (article.page_last != null && article.page_last !== article.page_first ? `${article.page_first}–${article.page_last}` : String(article.page_first)) : undefined;
  const title = lang === 'en' && article.title_en ? article.title_en : lang === 'ru' && article.title_ru ? article.title_ru : article.title_uz;
  const issue = article.issue;
  const journalInfo = issue ? `, ${issue.volume}(${issue.issue_number})` : '';
  const bibFields = [
    ...(authorsStr ? [`  author = {${(article.authors || []).map(a => a.full_name).join(' and ')}},`] : []),
    `  title = {${title}},`,
    '  journal = {AGM Journal},',
    ...(issue ? [`  volume = {${issue.volume}},`, `  number = {${issue.issue_number}},`] : []),
    ...(year ? [`  year = {${year}},`] : []),
    ...(pages ? [`  pages = {${pages.replace('–', '--')}},`] : []),
    ...(article.doi ? [`  doi = {${article.doi}},`] : []),
  ];
  const citations = {
    APA: `${authorsStr ? `${authorsStr} ` : ''}(${yearText}). ${title}. AGM Journal${journalInfo}${pages ? `, ${pages}` : ''}.${article.doi ? ` https://doi.org/${article.doi}` : ''}`,
    MLA: `${authorsStr ? `${authorsStr}. ` : ''}"${title}." AGM Journal${issue ? `, vol. ${issue.volume}, no. ${issue.issue_number}` : ''}${year ? `, ${year}` : ''}${pages ? `, pp. ${pages}` : ''}.${article.doi ? ` https://doi.org/${article.doi}` : ''}`,
    Chicago: `${authorsStr ? `${authorsStr}. ` : ''}"${title}." AGM Journal${issue ? ` ${issue.volume}, no. ${issue.issue_number}` : ''} (${yearText})${pages ? `: ${pages}` : ''}.${article.doi ? ` https://doi.org/${article.doi}` : ''}`,
    BibTeX: `@article{agm_${article.slug.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}${year ? `_${year}` : ''},\n${bibFields.join('\n')}\n}`,
  };

  const currentText = citations[format];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch { setCopyError(true); }
  };

  return (
    <div className="bg-[#f0f4f3] border border-[#d6e0df] p-5 sm:p-6 my-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Quote className="w-4 h-4 text-[#175f5b]" />
          <span>{text.cite}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-b border-[#b9cdca] text-xs font-semibold" role="group" aria-label={text.cite}>
          {(['APA', 'MLA', 'Chicago', 'BibTeX'] as const).map(fmt => (
            <button
              key={fmt}
              type="button"
              onClick={() => setFormat(fmt)}
              aria-pressed={format === fmt}
              className={`px-2.5 py-2 border-b-2 transition-colors ${
                format === fmt
                  ? 'border-[#175f5b] text-[#175f5b] bg-white'
                  : 'border-transparent text-slate-600 hover:text-[#175f5b]'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      <div className="relative bg-white border border-[#d6e0df] p-4 font-mono text-xs text-slate-800 leading-loose whitespace-pre-wrap break-words [overflow-wrap:anywhere]" aria-live="polite">
        {currentText}
      </div>

      {copyError && <p role="status" className="text-sm text-red-700 mt-2">{text.error}</p>}
      <div className="mt-3 flex justify-end">
        <a href={`/api/articles/${article.id}/citation?format=ris&lang=${lang}`} className="mr-4 text-xs text-teal-800 underline self-center">RIS</a>
        <a href={`/api/articles/${article.id}/citation?format=bib&lang=${lang}`} className="mr-4 text-xs text-teal-800 underline self-center">BibTeX ↓</a>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#175f5b] text-white hover:bg-[#104a47] text-xs font-medium transition-colors"
          aria-live="polite"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{text.copied}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>{text.copy}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
