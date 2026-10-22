import { TrackingLinkForm } from '@/components/TrackingLinkForm';
export const metadata = { title: 'Maqola holati / Manuscript tracking — AGM Journal', robots: { index: false, follow: false } };
export default function TrackPage() {
  return <div className="journal-container interior-page py-12 space-y-7"><h1 className="text-3xl font-bold">Maqola holatini kuzatish / Track your manuscript</h1><p className="max-w-2xl leading-relaxed text-slate-600">Maqola yuborganingizda ishlatgan emailingiz va yuborish raqamini kiriting. Sizga maqola holati hamda tahririyat izohlarini ko‘rish uchun maxfiy havola yuboramiz.</p><TrackingLinkForm /></div>;
}
