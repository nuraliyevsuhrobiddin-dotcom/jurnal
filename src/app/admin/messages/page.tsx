import { journalStore } from '@/lib/data-store';
import { Mail } from 'lucide-react';
import { remoteRows } from '@/lib/remote-db';

export default async function MessagesPage() {
  journalStore.refresh();
  const saved = await remoteRows<(typeof journalStore.contactMessages)[number]>('contact_messages') || journalStore.contactMessages;
  const messages = [...saved].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return <div className="space-y-6">
    <div className="bg-white p-6 rounded-2xl academic-border">
      <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3"><Mail /> Murojaatlar</h1>
      <p className="text-slate-600 mt-2">Aloqa formasi orqali kelgan xabarlar: {messages.length}</p>
    </div>
    {messages.length === 0 ? <p className="bg-white p-8 rounded-xl text-slate-600">Hozircha murojaatlar yo‘q.</p> : messages.map(message =>
      <article key={message.id} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold text-lg">{message.name}</h2><time className="text-sm text-slate-500">{new Date(message.created_at).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</time></div>
        <a className="text-teal-800 underline break-all" href={`mailto:${message.email}`}>{message.email}</a>
        <p className="whitespace-pre-wrap break-words text-slate-700 leading-relaxed">{message.message}</p>
      </article>)}
  </div>;
}
