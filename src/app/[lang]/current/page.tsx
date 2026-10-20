import { IssuePage } from '@/components/issues/IssuePage';
import { publicPageMetadata } from '@/lib/page-metadata';
import type { Language } from '@/types/journal';

export default async function CurrentIssuePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const language = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  return <IssuePage lang={language} />;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const language = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const titles = { uz: 'Joriy son', en: 'Current issue', ru: 'Текущий выпуск' };
  const descriptions = {
    uz: 'AGM Journal jurnalining joriy soni va unda nashr etilgan ilmiy maqolalar bilan tanishing.',
    en: 'Read the current issue of AGM Journal and its published research articles.',
    ru: 'Ознакомьтесь с текущим выпуском AGM Journal и опубликованными в нём научными статьями.',
  };
  return publicPageMetadata(language, '/current', titles[language], descriptions[language]);
}
