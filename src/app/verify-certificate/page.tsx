import { redirect } from 'next/navigation';

export default async function LegacyVerifyCertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const query = code ? `?code=${encodeURIComponent(code)}` : '';
  redirect(`/uz/verify-certificate${query}`);
}
