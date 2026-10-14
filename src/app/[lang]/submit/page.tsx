import { notFound } from 'next/navigation';
import type { Language } from '@/types/journal';
import { SubmissionForm } from '@/components/SubmissionForm';

export default async function SubmitPage({ params }: { params: Promise<{ lang: string }> }) {
 const { lang } = await params;
 if (!['uz', 'en', 'ru'].includes(lang)) notFound();
 return <SubmissionForm lang={lang as Language} />;
}
