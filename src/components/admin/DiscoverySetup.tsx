import { SITE_URL, siteUrl } from '@/lib/site-url';

export function DiscoverySetup({ verifiedToken, doiPrefix, crossrefReady }: { verifiedToken: boolean; doiPrefix?: string; crossrefReady: boolean }) {
  const property = `https://search.google.com/search-console?resource_id=${encodeURIComponent(SITE_URL + '/')}`;
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
    <div className="space-y-2">
      <h2 className="text-xl font-bold text-navy-900">Google’da topilish va DOI’ni yoqish</h2>
      <p className="text-sm text-slate-600">Google qidiruvi, Google Scholar va Crossref DOI — alohida xizmatlar. DOI Google’da ko‘rinish uchun majburiy emas.</p>
    </div>
    <div className="space-y-3">
      <h3 className="font-semibold text-navy-900">1. Google Search Console</h3>
      <p className="text-sm text-slate-600">{verifiedToken ? 'HTML tasdiqlash tokeni sozlangan. Search Console hisobida mulk tasdiqlanganini tekshiring.' : 'HTML tasdiqlash tokeni sozlanmagan. Avval Google hisobingizda sayt mavjudligini tekshiring; DNS orqali tasdiqlangan saytga HTML tokeni shart emas.'}</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
        <li><a href={property} target="_blank" rel="noopener noreferrer" className="text-teal-800 underline">Search Console’ni oching</a>. Sayt bo‘lmasa, URL prefix sifatida <code>{SITE_URL}/</code> qo‘shing.</li>
        <li>HTML tag usulida berilgan <code>content</code> qiymatini hostingdagi <code>GOOGLE_SITE_VERIFICATION</code> ga saqlang, saytni qayta deploy qiling va Google’da Verify bosing. Domen mulki usulini tanlasangiz, Google bergan TXT yozuvini domen DNS’iga qo‘shing.</li>
        <li>Sitemaps bo‘limiga <a href="/sitemap.xml" className="text-teal-800 underline">{siteUrl('/sitemap.xml')}</a> ni yuboring.</li>
        <li>URL Inspection’da bosh sahifa va maqola havolasini tekshiring: Test live URL → Request indexing. Page indexing hisobotidagi sabablarni ko‘ring.</li>
      </ol>
      <p className="text-sm text-slate-600">Google ko‘rib chiqishi kunlar yoki haftalar olishi mumkin. Kalit so‘z qo‘shish yoki indekslash so‘rovi natijada chiqishni kafolatlamaydi.</p>
    </div>
    <div className="space-y-3 border-t border-slate-100 pt-4">
      <h3 className="font-semibold text-navy-900">2. Crossref DOI</h3>
      <p className="text-sm text-slate-600">Hisob: {crossrefReady ? 'sozlangan' : 'sozlanmagan'}. Jurnal DOI prefiksi: {doiPrefix || 'kiritilmagan'}.</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
        <li><a href="https://www.crossref.org/membership/" target="_blank" rel="noopener noreferrer" className="text-teal-800 underline">Crossref a’zoligi</a> yoki <a href="https://www.crossref.org/membership/about-sponsors/" target="_blank" rel="noopener noreferrer" className="text-teal-800 underline">homiy tashkilot</a> orqali depozit hisobi va sizga ajratilgan DOI prefiksini oling.</li>
        <li>Hostingda CROSSREF_USERNAME va CROSSREF_PASSWORD ni saqlang. Jurnal sozlamalariga haqiqiy DOI prefiksi va ISSN’ni kiriting. Alohida test hisobi bilan CROSSREF_MODE=test rejimini tekshiring.</li>
        <li>Hisob va vakolat tasdiqlangach, CROSSREF_MODE=production hamda INTEGRATION_PRODUCTION_ENABLED=true ni yoqing va qayta deploy qiling.</li>
        <li>Maqolaga o‘z prefiksingizdagi noyob DOI kiriting; metama’lumotlarni tekshiring va quyidagi tugmadan yuboring. Keyin yakuniy hisobotni tekshiring. Navbatga qabul qilingani DOI ro‘yxatdan o‘tganini bildirmaydi.</li>
      </ol>
    </div>
  </section>;
}
