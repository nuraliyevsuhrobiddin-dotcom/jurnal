import { IssuePage } from '@/components/issues/IssuePage';
import { publicPageMetadata } from '@/lib/page-metadata';
import type { Language } from '@/types/journal';

export default async function CurrentIssuePage({ params }: { params: Promise<{ lang: string }> }) {
 const { lang } = await params;
 return <IssuePage lang={(['en','uz','ru'].includes(lang) ? lang : 'en') as Language} />;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return publicPageMetadata((['en','uz','ru'].includes(lang) ? lang : 'en') as Language, '/current', 'Current issue', 'Read the current issue of AGM Journal and its published research articles.');
}
