import { notFound } from 'next/navigation';
import { IssuePage } from '@/components/issues/IssuePage';
import { getIssueById } from '@/lib/db';
import { publicPageMetadata } from '@/lib/page-metadata';
import type { Language } from '@/types/journal';

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  if (!['en', 'uz', 'ru'].includes(lang) || !/^[a-f0-9-]{36}$/i.test(id)) notFound();
  const issue = await getIssueById(id); if (!issue) notFound();
  const title = (lang === 'en' ? issue.title_en : lang === 'ru' ? issue.title_ru : issue.title_uz) || `Volume ${issue.volume}, Issue ${issue.issue_number} (${issue.year})`;
  return publicPageMetadata(lang as Language, `/issue/${id}`, title, (lang === 'en' ? issue.description_en : lang === 'ru' ? issue.description_ru : issue.description_uz) || 'Research articles and complete journal issue PDF.');
}

export default async function IssueDetailPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  if (!['en', 'uz', 'ru'].includes(lang) || !/^[a-f0-9-]{36}$/i.test(id)) notFound();
  return <IssuePage lang={lang as Language} issueId={id} />;
}
