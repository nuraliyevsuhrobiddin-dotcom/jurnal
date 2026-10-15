import { Download } from 'lucide-react';
import type { Language } from '@/types/journal';

export function IssueDownloadLink({ id, lang = 'en' }: { id: string; lang?: Language }) {
  return <a href={`/api/issues/${id}/pdf`} className="inline-flex items-center gap-2 rounded-md border border-teal-700 bg-white px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50">
    <Download size={15} aria-hidden="true" />
    {lang === 'uz' ? 'To‘liq sonni yuklash (PDF)' : lang === 'ru' ? 'Скачать выпуск (PDF)' : 'Download complete issue (PDF)'}
  </a>;
}
