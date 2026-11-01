import { notFound } from 'next/navigation';
import type { Language } from '@/types/journal';
import { SubmissionForm } from '@/components/SubmissionForm';
import { cookies } from 'next/headers';
import { configured, orcidConfig } from '@/lib/integration-config';
import { orcidProofCookie, readOrcidProof } from '@/lib/orcid-auth';
import { publicPageMetadata } from '@/lib/page-metadata';
import { submissionTranslator } from '@/lib/submission-copy';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
 const { lang } = await params;
 if (!['uz', 'en', 'ru'].includes(lang)) notFound();
 const language = lang as Language;
 const t = submissionTranslator(language);
 return publicPageMetadata(language, '/submit', t('Submit a manuscript'), t('Manuscripts are accepted in Uzbek, English and Russian. Receipt does not constitute acceptance for publication.'));
}

export default async function SubmitPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ orcid?: string | string[] }> }) {
 const { lang } = await params;
 if (!['uz', 'en', 'ru'].includes(lang)) notFound();
 const proof = readOrcidProof((await cookies()).get(orcidProofCookie)?.value);
 return <SubmissionForm lang={lang as Language} orcidEnabled={configured(orcidConfig)} orcidFailed={(await searchParams).orcid === 'failed'} orcidIdentity={proof ? { id: proof.id, name: proof.name, environment: proof.environment } : undefined} />;
}
