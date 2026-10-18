import { MIN_COLLECTION_ARTICLES, collectionPendingMessage } from '@/lib/issues/collection-policy';
import { Download } from 'lucide-react';
import type { Language } from '@/types/journal';

export function IssueDownloadLink({ id, lang = 'en', articleCount }: { id: string; lang?: Language; articleCount: number }) {
  if (articleCount < MIN_COLLECTION_ARTICLES) return <p className="text-sm" role="status">{collectionPendingMessage(lang, articleCount)}</p>;
  return <a href={`/api/issues/${id}/pdf`} className="inline-flex items-center gap-2 rounded-md border border-teal-700 bg-white px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50">
    <Download size={15} aria-hidden="true" />
    {lang === 'uz' ? 'To‘liq sonni yuklash (PDF)' : lang === 'ru' ? 'Скачать выпуск (PDF)' : 'Download complete issue (PDF)'}
  </a>;
}
