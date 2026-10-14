import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, FileWarning, FileText } from 'lucide-react';
import { getJournalSettings } from '@/lib/db';
import { getHandbookHash, getPolicyDocument, getPolicyDocuments, getPolicyHash, isJournalLanguage, isPolicyId } from '@/lib/policies';
import { POLICY_DATE, POLICY_VERSION } from '@/types/policies';

export default async function PolicyVerificationPage({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<{ id?: string; version?: string; hash?: string }>;
}) {
  const { lang } = await params; const query = await searchParams;
  if (!isJournalLanguage(lang)) notFound();
  const id = query.id || '';
  const validId = id === 'handbook' || isPolicyId(id);
  const settings = await getJournalSettings();
  const document = isPolicyId(id) ? getPolicyDocument(id, lang, settings) : null;
  const currentHash = id === 'handbook' ? getHandbookHash(getPolicyDocuments(lang, settings), lang) : document ? getPolicyHash(document, lang) : '';
  const match = validId && query.version === POLICY_VERSION && /^[a-f0-9]{64}$/.test(query.hash || '') && query.hash === currentHash;
  const labels = lang === 'uz' ? {
    title: 'Hujjat versiyasini tekshirish', matched: 'Mazmun joriy nashrga mos', different: 'Joriy nashr bilan moslik tasdiqlanmadi', detail: 'QR-koddagi mazmun identifikatori saytning hozirgi hujjati bilan taqqoslanadi. Bu tekshiruv hujjat versiyasini ko‘rsatadi; shaxsning elektron imzosini tekshirmaydi.', version: 'Joriy versiya', date: 'Tahrir sanasi', download: 'Joriy PDF faylini yuklash', hub: 'Barcha nizomlar', read: 'Hujjatni o‘qish',
  } : lang === 'ru' ? {
    title: 'Проверка версии документа', matched: 'Содержание соответствует текущему изданию', different: 'Соответствие текущему изданию не подтверждено', detail: 'Идентификатор содержания из QR-кода сравнивается с текущим документом сайта. Проверяется версия документа, а не электронная подпись физического лица.', version: 'Текущая версия', date: 'Дата редакции', download: 'Скачать текущий PDF', hub: 'Все правила', read: 'Читать документ',
  } : {
    title: 'Document version verification', matched: 'Content matches the current edition', different: 'A match with the current edition was not confirmed', detail: 'The content identifier in the QR code is compared with the current website document. This checks the document edition; it does not validate a person’s electronic signature.', version: 'Current version', date: 'Revision date', download: 'Download current PDF', hub: 'All policies', read: 'Read document',
  };
  return <div className="journal-container py-8 space-y-6">
    <h1 className="text-3xl font-bold text-navy-900">{labels.title}</h1>
    <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4 max-w-3xl">
      <div className={`flex items-center gap-3 font-bold ${match ? 'text-emerald-800' : 'text-gold-800'}`}>{match ? <CheckCircle2 /> : <FileWarning />}{match ? labels.matched : labels.different}</div>
      <p className="text-slate-700 leading-relaxed">{labels.detail}</p>
      {document && <h2 className="font-bold text-navy-900">{document.title}</h2>}
      <dl className="flex flex-wrap gap-6 text-sm"><div><dt className="text-slate-600">{labels.version}</dt><dd className="font-semibold">{POLICY_VERSION}</dd></div><div><dt className="text-slate-600">{labels.date}</dt><dd className="font-semibold">{POLICY_DATE}</dd></div></dl>
      {currentHash && <p className="break-all text-xs text-slate-600 font-mono">SHA-256: {currentHash}</p>}
      <div className="flex flex-wrap gap-3">
        {validId && <a className="inline-flex gap-2 items-center rounded-lg bg-navy-900 text-white px-4 py-3 font-semibold" href={`/api/policies/${id}/pdf?lang=${lang}`}><FileText className="w-4 h-4" />{labels.download}</a>}
        {document && <Link className="border border-slate-300 rounded-lg px-4 py-3 text-navy-900" href={`/${lang}/${document.id}`}>{labels.read}</Link>}
        <Link className="border border-slate-300 rounded-lg px-4 py-3 text-navy-900" href={`/${lang}/policies`}>{labels.hub}</Link>
      </div>
    </div>
  </div>;
}
