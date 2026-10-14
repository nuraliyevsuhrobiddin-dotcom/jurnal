import { PolicyDocumentPage } from '@/components/policies/PolicyDocumentPage';

export default function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <PolicyDocumentPage id="journal-charter" params={params} />;
}
