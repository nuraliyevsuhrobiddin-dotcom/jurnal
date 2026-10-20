import { notFound } from 'next/navigation';
import type { Language } from '@/types/journal';
import { SubmissionForm } from '@/components/SubmissionForm';
import { cookies } from 'next/headers';
import { configured, orcidConfig } from '@/lib/integration-config';
import { orcidProofCookie, readOrcidProof } from '@/lib/orcid-auth';

export default async function SubmitPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ orcid?: string | string[] }> }) {
 const { lang } = await params;
 if (!['uz', 'en', 'ru'].includes(lang)) notFound();
 const proof = readOrcidProof((await cookies()).get(orcidProofCookie)?.value);
 return <SubmissionForm lang={lang as Language} orcidEnabled={configured(orcidConfig)} orcidFailed={(await searchParams).orcid === 'failed'} orcidIdentity={proof ? { id: proof.id, name: proof.name, environment: proof.environment } : undefined} />;
}
