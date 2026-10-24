# Google qidiruvi va Crossref DOI’ni ishga tushirish

## 2026-10-24 tekshiruvi

`https://agmjoural.uz` ochildi. Domen Vercel’da tasdiqlangan va DNS sozlamasi mos. `/robots.txt` va `/sitemap.xml` HTTP 200 qaytardi; sitemap’da 114 ta manzil, jumladan 3 ta maqolaning inglizcha manzili bor. Tekshirilgan sahifalarda `noindex` yo‘q, canonical manzillari to‘g‘ri. Maqola nomi, muallif, nashr sanasi va PDF havolasi JavaScriptsiz HTML’da ko‘rinadi.

Bu natijalar Google saytni indekslaganini yoki ma’lum kalit so‘z bo‘yicha chiqarishini tasdiqlamaydi. Foydalanuvchi sayt Search Console’da tasdiqlanganini ma’lum qildi; yangi HTML tokeni talab qilinmaydi. Hisobdagi URL Inspection va sitemap natijasiga kirish bo‘lmagani uchun indekslanmaslikning aniq sababi hali aniqlanmadi. HTML tasdiqlash tokeni mahalliy sozlamalarda ham, production hosting o‘zgaruvchilarida ham yo‘q, lekin boshqa tasdiqlash usuli qo‘llangan bo‘lishi mumkin.

Foydalanuvchi sitemap ham yuborilganini ma’lum qildi. URL Inspection’dagi aynan qaysi holat ko‘rsatilayotgani va sitemap’ning Google qaytargan “Success” holati hali ko‘rilmadi; yangi tasdiq yoki qayta-qayta yuborish shart deb belgilanmadi.

Tekshiruvni qaytarish:

```sh
npm run check:discovery -- --report
```

Natija: `artifacts/search-discovery/report.json`. Buyruq faqat ochiq sahifalarni o‘qiydi, Google’ga indekslash so‘rovi yubormaydi. Googlebot User-Agent bilan HTTP tekshiruvi haqiqiy Google crawler tashrifi isboti emas.

## Google Search Console

1. Jurnalga tegishli Google hisobida [Search Console](https://search.google.com/search-console) ni oching. Mavjud mulklar orasida `agmjoural.uz` yoki `https://agmjoural.uz/` borligini tekshiring.
2. Bo‘lmasa **Add property → URL prefix → `https://agmjoural.uz/`** ni tanlang. **HTML tag** usulidagi tegning `content` qiymatini oling. Bu ochiq tasdiqlash tokeni; Google paroli yoki API kaliti emas.
3. Hosting production muhitiga `GOOGLE_SITE_VERIFICATION=<Google bergan qiymat>` qo‘shib, qayta deploy qiling. Lokal `.env.local` ga yozishning o‘zi production saytni o‘zgartirmaydi. Yangi token o‘ylab topmang va bu maydonga Google parolini kiritmang.
4. Sahifa HTML’ida `google-site-verification` chiqqanini tekshiring, so‘ng Google’da **Verify** bosing. Agar **Domain property** tanlangan bo‘lsa, Google bergan TXT yozuvini domen DNS provayderida saqlash kerak. Bu domenning DNS’i ahost nameserverlarida; Vercel’da alohida TXT qo‘shish amaldagi DNS’ni o‘zgartirmasligi mumkin.
5. **Sitemaps** bo‘limiga `https://agmjoural.uz/sitemap.xml` ni yuboring.
6. **URL Inspection** da `https://agmjoural.uz/en` va haqiqiy maqola sahifasini tekshiring. **Test live URL → Request indexing** ni bosing. **Page indexing** hisobotidagi sababni o‘qing; robots, canonical, duplicate yoki crawl xatolari bo‘lsa o‘sha sababni tuzating.

Google bir necha kun yoki hafta ichida ko‘rib chiqishi mumkin, lekin aniq muddat va qidiruvdagi o‘rin kafolatlanmaydi. Meta keywords Google reyting omili emas. O‘quvchiga ko‘rinadigan haqiqiy sarlavha, to‘g‘ri muallif ismi, mazmunli annotatsiya va kalit so‘zlar, asl ilmiy kontent va haqiqiy tashqi havolalar muhim. Takrorlangan maqola yozuvlari va muallif nomidagi `XXX` ni tahririyat aniqlashtirishi kerak.

Google Scholar alohida tizim: Search Console yoki DOI uning qabulini kafolatlamaydi. Ilmiy maqolalar uchun Google Indexing API’dan foydalanilmaydi.

## Crossref hisobi va DOI prefiksi

Foydalanuvchi Crossref hisobi va prefiksi hali olinmaganini tasdiqladi. Mahalliy va hosting muhitida Crossref depozit kalitlari yo‘q. Hozir haqiqiy DOI ro‘yxatdan o‘tkazilgani da’vo qilinmaydi.

1. Nashriyot [Crossref a’zoligi](https://www.crossref.org/membership/) yoki [homiy tashkilot](https://www.crossref.org/membership/about-sponsors/) orqali murojaat qiladi. Hisob, nashriyot roli va tegishli DOI prefiksi tashqi xizmat tomonidan beriladi; sayt ularni yarata olmaydi. A’zolik va depozit xarajatlari bo‘lishi mumkin; shartlarni nashriyot tasdiqlaydi.
2. Berilgan `CROSSREF_USERNAME` va `CROSSREF_PASSWORD` ni faqat maxfiy lokal muhitga va hosting environment variables’ga saqlang. Shaxsiy Crossref loginidan foydalanilganda, Crossref ko‘rsatgan `email/role` formatini ishlating. Parolni chat, Git yoki mijoz brauzeriga joylamang.
3. `/admin/settings` da sizga berilgan DOI prefiksi va jurnalning haqiqiy ISSN’ini kiriting. Format tekshiruvi prefiksga egalik yoki ISSN ro‘yxati isboti emas.
4. Crossref alohida ochib bergan **test hisobi** bilan `CROSSREF_MODE=test` rejimini tekshiring. Test depoziti haqiqiy production DOI emas.
5. Production hisob va vakolat tekshirilgach, `CROSSREF_MODE=production` va `INTEGRATION_PRODUCTION_ENABLED=true` ni hostingda yoqing, keyin qayta deploy qiling. Oxirgi bayroq Zenodo production rejimiga ham ruxsat berishini hisobga oling; `ZENODO_MODE` o‘zgarishi alohida qaror.
6. Har maqolaga **o‘z prefiksingizdagi noyob DOI** belgilang. Boshqa nashriyot prefiksini yoki namuna DOI’ni ishlatmang. Nom, mualliflar, inglizcha annotatsiya, nashr sanasi, sahifalar, litsenziya va barqaror maqola URL’ini tekshiring.
7. `/admin/integrations` da Crossref XML’ni tekshirib yuboring. Tizim har depozitga noyob XML fayl nomi beradi va bir xil so‘rovni takroran yuborishdan saqlaydi.
8. **Crossref yakuniy hisobotini tekshirish** tugmasi batch ID bo‘yicha Crossref processing log’ini o‘qiydi. `submitted` faqat navbatga qabul qilish; Crossref uchun `ready` yakuniy hisobot muvaffaqiyatli bo‘lganini bildiradi. Test rejimi alohida ko‘rsatiladi. Konflikt yoki ogohlantirish avtomatik tasdiqlanmaydi.
9. Sahifa yangilangandan keyin tugma ko‘rinmasa, bir xil, o‘zgarmagan maqolani qayta yuborish tugmasi saqlangan job’ni qaytaradi; tashqi depozitni takrorlamaydi. Metama’lumot o‘zgarsa yangi depozit identifikatori hosil bo‘ladi. Eski hisobotni Crossref hisobidan ham ko‘rish mumkin.
10. Production hisobotidan keyin `https://doi.org/<DOI>` aynan shu maqolaga olib borishini tekshiring. Crossref metama’lumotlarining barcha qidiruv xizmatlarida ko‘rinishi kechikishi mumkin.

Depozit hisobotining texnik holati maxfiy `integration_jobs` jurnalida saqlanadi. Hisobot endpoint’i faqat admin uchun; boshqa maqola/provider/rejim job’i rad etiladi. Credentials URL’ga Crossref hujjatlashtirgan usulda yuboriladi, lekin ilova jurnaliga yoki javobiga chiqarilmaydi, redirect’ga uzatilmaydi. Aloqa xatosi avtomatik qayta depozit yubormaydi. Hisob berilmagani sabab bu oqim haqiqiy Crossref hisobida sinalmagan; kontrakt va xavfsizlik holatlari mock testlar bilan tekshirildi.

## Rasmiy manbalar

- [Google: qayta crawl va indekslash so‘rovi](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
- [Google: sitemap nimaga xizmat qiladi](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- [Google: SEO qo‘llanmasi va meta keywords](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Crossref: navbatga qabul qilish va yakuniy ro‘yxat](https://www.crossref.org/documentation/register-maintain-records/verify-your-registration/)
- [Crossref: processing log’larini olish](https://www.crossref.org/documentation/register-maintain-records/verify-your-registration/submission-queue-and-log/)
- [Crossref: log natijalarini talqin qilish](https://www.crossref.org/documentation/register-maintain-records/verify-your-registration/interpret-submission-logs/)
