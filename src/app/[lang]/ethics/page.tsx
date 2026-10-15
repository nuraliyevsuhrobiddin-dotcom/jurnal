import { policyMetadata } from '@/lib/page-metadata';
import { PolicyDocumentPage } from '@/components/policies/PolicyDocumentPage';

export default function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <PolicyDocumentPage id="ethics" params={params} />;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return policyMetadata('ethics', (await params).lang);
}
