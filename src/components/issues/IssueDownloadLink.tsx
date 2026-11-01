import { MIN_COLLECTION_ARTICLES, collectionPendingMessage } from '@/lib/issues/collection-policy';
import { Download, BookOpen } from 'lucide-react';
import type { Language } from '@/types/journal';

export function IssueDownloadLink({ id, lang = 'en', articleCount }: { id: string; lang?: Language; articleCount: number }) {
  if (articleCount < MIN_COLLECTION_ARTICLES) {
    return (
      <div className="inline-flex items-center gap-2.5 rounded-lg border border-teal-200/80 bg-teal-50/80 px-4 py-2.5 text-xs text-teal-900 shadow-xs" role="status">
        <BookOpen size={15} className="text-teal-700 shrink-0" aria-hidden="true" />
        <span className="font-medium">{collectionPendingMessage(lang, articleCount)}</span>
      </div>
    );
  }
  return (
    <a href={`/api/issues/${id}/pdf`} className="inline-flex items-center gap-2 rounded-md border border-teal-700 bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition">
      <Download size={15} aria-hidden="true" />
      <span>{lang === 'uz' ? 'To‘liq sonni yuklash (PDF)' : lang === 'ru' ? 'Скачать выпуск (PDF)' : 'Download complete issue (PDF)'}</span>
    </a>
  );
}
