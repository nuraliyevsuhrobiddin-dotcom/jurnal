'use client';

import React, { useState } from 'react';
import { Article } from '@/types/journal';
import { Copy, Check, Quote } from 'lucide-react';

interface CitationBoxProps {
  article: Article;
}

export function CitationBox({ article }: CitationBoxProps) {
  const [format, setFormat] = useState<'APA' | 'MLA' | 'Chicago' | 'BibTeX'>('APA');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const authorsStr = (article.authors || []).map(a => a.full_name).join(', ') || 'Anonymous';
  const year = article.issue?.year || (article.publication_date ? new Date(article.publication_date).getFullYear() : 2026);
  const vol = article.issue?.volume || 1;
  const num = article.issue?.issue_number || 1;
  const pages = article.page_first ? `${article.page_first}–${article.page_last || article.page_first}` : '1–10';
  const title = article.title_en || article.title_uz;

  const citations = {
    APA: `${authorsStr} (${year}). ${title}. AGM Journal, ${vol}(${num}), ${pages}.${article.doi ? ` https://doi.org/${article.doi}` : ''}`,
    MLA: `${authorsStr}. "${title}." AGM Journal, vol. ${vol}, no. ${num}, ${year}, pp. ${pages}.${article.doi ? ` DOI:${article.doi}` : ''}`,
    Chicago: `${authorsStr}. "${title}." AGM Journal ${vol}, no. ${num} (${year}): ${pages}.${article.doi ? ` https://doi.org/${article.doi}` : ''}`,
    BibTeX: `@article{agm_${article.slug.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}_${year},
  author = {${authorsStr.replace(/,/g, ' and')}},
  title = {${title}},
  journal = {AGM Journal},
  volume = {${vol}},
  number = {${num}},
  year = {${year}},
  pages = {${pages}},
  ${article.doi ? `doi = {${article.doi}},` : ''}
  publisher = {AGM Scientific Publishing Academy}
}`
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
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 my-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Quote className="w-4 h-4 text-gold-700" />
          <span>Iqtibos keltirish / How to Cite</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
          {(['APA', 'MLA', 'Chicago', 'BibTeX'] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`px-2.5 py-1 rounded transition-colors ${
                format === fmt
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      <div className="relative bg-white border border-slate-200 rounded-lg p-3 font-mono text-xs text-slate-800 leading-relaxed overflow-x-auto whitespace-pre-wrap">
        {currentText}
      </div>

      {copyError && <p role="status" className="text-sm text-red-700 mt-2">Nusxa olish imkoni bo&apos;lmadi. Matnni tanlab nusxa oling.</p>}
      <div className="mt-3 flex justify-end">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-navy-900 text-white hover:bg-navy-800 text-xs font-medium transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nusxalandi! / Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Iqtibosdan nusxa olish</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
