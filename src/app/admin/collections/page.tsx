import Link from 'next/link';
import { getAllIssues } from '@/lib/db';
import { getCollectionSummaries } from '@/lib/issues/collections';
import { MIN_COLLECTION_ARTICLES } from '@/lib/issues/collection-policy';
import { subjectLabel } from '@/lib/subjects';

export default async function CollectionsPage() {
  const [issues, collections] = await Promise.all([getAllIssues(), getCollectionSummaries()]);
  return <div className="space-y-6"><header><h1 className="text-3xl font-bold text-navy-900">Yo‘nalish to‘plamlari</h1><p className="mt-2 text-slate-600">Har bir jurnal soni va yo‘nalish alohida sanaladi. {MIN_COLLECTION_ARTICLES} ta nashr etilgan maqolaga yetgan to‘plam avtomatik ochiladi va keyin qayta yashirilmaydi.</p></header>{issues.map(issue => <section key={issue.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"><h2 className="text-xl font-semibold">{issue.year} · Jild {issue.volume}, son {issue.issue_number}</h2><div className="grid gap-4 md:grid-cols-2">{collections.filter(item => item.issue_id === issue.id).map(item => <article key={item.subject_id} className="rounded-lg border border-slate-200 p-4 space-y-2"><h3 className="font-semibold">{subjectLabel(item.subject_id,'uz')}</h3><p>{item.published_count}/{MIN_COLLECTION_ARTICLES} · {item.released_at ? 'Ochilgan' : 'Yig‘ilmoqda'}</p><progress className="w-full" max={MIN_COLLECTION_ARTICLES} value={Math.min(item.published_count,MIN_COLLECTION_ARTICLES)} aria-label={`${subjectLabel(item.subject_id,'uz')}: ${item.published_count} ta maqola`} />{item.released_at && <p className="text-xs text-slate-500">Ochilgan sana: {new Date(item.released_at).toISOString().slice(0,10)}</p>}<Link className="text-sm text-teal-800 underline" href={`/uz/subjects/${item.subject_id}?issue=${issue.id}`}>Saytdagi to‘plamni ko‘rish</Link></article>)}</div></section>)}</div>;
}
