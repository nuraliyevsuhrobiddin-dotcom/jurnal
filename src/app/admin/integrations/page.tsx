import Link from 'next/link';
import { getAllArticlesAdmin, getJournalSettings } from '@/lib/db';
import { crossrefGaps } from '@/lib/crossref-export';
import { mailConfigured, mailProvider } from '@/lib/notifications';
import { isServerSupabaseConfigured } from '@/lib/supabase/server';
import { IntegrationControls, DepositActions } from '@/components/admin/IntegrationControls';
import { configured, crossrefConfig, zenodoConfig, orcidConfig } from '@/lib/integration-config';

export default async function IntegrationsPage() {
  const [articles, settings] = await Promise.all([getAllArticlesAdmin(), getJournalSettings()]);
  const published = articles.filter(article => article.status === 'published');
  const orcidReady = configured(orcidConfig);
  const zenodoReady = configured(zenodoConfig);
  const services = [
    { name: 'OAI-PMH', state: 'Ishlaydi', detail: 'Dublin Core metama’lumotlari; sana filtri va sahifalangan yig‘ish.', href: '/api/oai?verb=Identify', action: 'Repozitoriyni tekshirish' },
    { name: 'RSS', state: 'Ishlaydi', detail: 'Yangi nashrlar tasmasi. O‘zbek, ingliz va rus tillari.', href: '/feed.xml?lang=uz', action: 'RSS tasmasini ochish' },
    { name: 'Google Scholar', state: 'Metama’lumot mavjud', detail: 'Indekslashni Google hal qiladi. Search Console tekshiruvi: ' + (process.env.GOOGLE_SITE_VERIFICATION ? 'token sozlangan.' : 'token sozlanmagan.'), href: '/sitemap.xml', action: 'Sayt xaritasi' },
    { name: mailProvider() === 'gmail' ? 'Email / Gmail' : 'Email / Resend', state: mailConfigured() ? 'Kalitlar sozlangan' : 'Sozlash kerak', detail: 'Gmail uchun Google OAuth kalitlari va GMAIL_SENDER; Resend uchun RESEND_API_KEY va tasdiqlangan MAIL_FROM kerak.', href: '/admin/notifications', action: 'Email navbatini ko‘rish' },
    { name: 'Email qayta urinish jadvali', state: process.env.CRON_SECRET ? 'Maxfiy kalit sozlangan' : 'CRON_SECRET kerak', detail: 'Supabase jadvali: migration 012 va Vault sozlangach har 5 daqiqada. Har ishga tushishda 30 tagacha xat qayta ishlanadi. Vercel kunlik jadvali zaxira sifatida qoladi.', href: '/admin/notifications', action: 'Navbatni tekshirish' },
    { name: 'Supabase', state: isServerSupabaseConfigured ? 'Kalitlar sozlangan' : 'Lokal saqlash', detail: 'Production uchun DB, saqlash bucketlari va 001–012 migratsiyalarini tekshiring.', href: '/admin/settings', action: 'Jurnal sozlamalari' },
    { name: 'ORCID', state: orcidReady ? `OAuth sozlangan — ${orcidConfig().environment}` : 'OAuth kalitlari kerak', detail: 'Muallif maqola yuborish formasida ORCID orqali tasdiqlanadi. Sandbox profili haqiqiy muallif identifikatori sifatida saqlanmaydi.', href: '/uz/submit', action: 'Yuborish formasini ko‘rish' },
    { name: 'Zenodo', state: zenodoReady ? `Kalit sozlangan — ${zenodoConfig().environment}` : 'Token kerak', detail: 'PDF va metama’lumotlar tekshirish uchun qoralamaga yuklanadi. Qoralama avtomatik nashr qilinmaydi.', href: 'https://developers.zenodo.org/', action: 'Zenodo API qo‘llanmasi' },
    { name: 'Crossref', state: configured(crossrefConfig) ? `Hisob sozlangan — ${crossrefConfig().environment}` : 'Hisob va DOI prefiksi kerak', detail: 'XML eksporti mavjud. Haqiqiy DOI ro‘yxati uchun nashriyot hisobi va Crossref qayta ishlash hisoboti talab qilinadi.', href: 'https://www.crossref.org/membership/', action: 'Crossref hisob tartibi' },
    { name: 'Antiplagiat', state: 'Xizmat hisobi kerak', detail: 'Similarity Check / iThenticate shartnomasi va API ruxsati olinmaguncha avtomatik tekshiruv yoqilmaydi.', href: 'https://www.crossref.org/services/similarity-check/', action: 'Xizmat haqida' },
  ];
  return <div className="space-y-8">
    <header><h1 className="text-3xl font-bold text-navy-900">Ilmiy integratsiyalar</h1>
      <p className="mt-2 text-slate-600">Ishlayotgan imkoniyatlar, sozlash holati va nashr metama’lumotlari eksporti.</p></header>
    <IntegrationControls />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{services.map(service => <section key={service.name} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <h2 className="text-lg font-bold text-navy-900">{service.name}</h2><p className="text-sm font-semibold text-teal-800">{service.state}</p>
      <p className="text-sm text-slate-600">{service.detail}</p><a href={service.href} className="inline-block text-sm font-semibold text-teal-800 underline">{service.action}</a>
    </section>)}</div>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <h2 className="text-xl font-bold text-navy-900">Maqola eksporti va repozitoriyga yuborish</h2>
      <p className="text-sm text-slate-600">Eksport DOI ro‘yxatdan o‘tkazmaydi. Faylni topshirish uchun Crossref nashriyot hisobi va sizga berilgan DOI prefiksi kerak. ISSN formati ro‘yxatdan o‘tganlik isboti emas.</p>
      <p className="text-sm text-amber-800">Muallif ismi bitta maydonda saqlangani uchun XML faylda to‘liq ism surname maydoniga tushadi. Depozitdan oldin ism/familiya qismlarini va barcha ma’lumotlarni tekshiring, Crossref XSD validatsiyasidan o‘tkazing.</p>
      {!published.length && <p className="text-sm text-slate-600">Hali nashr qilingan maqola yo‘q.</p>}
      <ul className="divide-y divide-slate-100">{published.map(article => {
        const gaps = crossrefGaps(article, settings);
        return <li key={article.id} className="py-4 space-y-2"><Link href={`/admin/articles/${article.id}/edit`} className="font-semibold text-navy-900 underline">{article.title_uz}</Link>
          {gaps.length ? <p className="text-sm text-amber-800">Yetishmaydi: {gaps.join(', ')}.</p> : <a href={`/api/admin/articles/${article.id}/crossref`} className="block text-sm font-semibold text-teal-800 underline">Crossref XML yuklab olish</a>}
          <a href={`/api/articles/${article.id}/metadata`} className="inline-block text-sm text-teal-800 underline">Ochiq JSON metama’lumotlari</a>
          <DepositActions articleId={article.id} crossref={!gaps.length && configured(crossrefConfig)} zenodo={configured(zenodoConfig)} crossrefMode={process.env.CROSSREF_MODE || 'test'} zenodoMode={process.env.ZENODO_MODE || 'sandbox'} />
        </li>;
      })}</ul>
    </section>
  </div>;
}
