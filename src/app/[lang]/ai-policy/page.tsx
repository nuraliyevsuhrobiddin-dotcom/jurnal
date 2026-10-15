import { policyMetadata } from '@/lib/page-metadata';
import { PolicyDocumentPage } from '@/components/policies/PolicyDocumentPage';

export default function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <PolicyDocumentPage id="ai-policy" params={params} />;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return policyMetadata('ai-policy', (await params).lang);
}
