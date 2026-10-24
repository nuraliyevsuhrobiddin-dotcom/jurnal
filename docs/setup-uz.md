# AGM Journal: kalitlar va ishga tushirish

Mavjud haqiqiy sozlamalar foydalanuvchi so‘roviga binoan `.env` fayliga ham ko‘chirildi. `.env` va `.env.local` maxfiy qiymatlar saqlaydi va Git'ga yuborilmaydi. `.env.example` kalitsiz namuna. Next.js bir xil nom uchun `.env.local` qiymatini ustun oladi; qiymatni almashtirganda ikkala faylni moslang. Mavjud fayllar ustiga namunani nusxalamang.

Next.js avval hosting/jarayon muhitini, keyin muhitga xos `.env.*.local`, `.env.local`, `.env.*` va `.env` fayllarini o‘qiydi. Hostingdagi qiymatni mahalliy fayl almashtirmaydi. `NEXT_PUBLIC_` qiymatlari build vaqtida brauzer kodiga kiritiladi; ular o‘zgarsa qayta build kerak. Maxfiy kalitlarga bu prefiksni qo‘ymang.

## Qiymatlar qayerdan olinadi?

| O‘zgaruvchi | Manbasi va vazifasi |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Saytning haqiqiy HTTPS manzili; mahalliy sinov uchun `http://localhost:3000`. |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `uz`, `en` yoki `ru`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase loyihasining Project URL qiymati. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Shu loyihaning publishable yoki legacy anon kaliti. |
| `SUPABASE_SERVICE_ROLE_KEY` | Shu loyihaning secret yoki legacy service_role kaliti. Faqat server uchun. |
| `ADMIN_PASSWORD` | Operator tanlagan uzun, noyob parol; Supabase paroli emas. |
| `CRON_SECRET` | Operator yaratgan tasodifiy maxfiy qiymat; rejalashtirilgan API chaqiruvi uchun. |
| `TRACKING_SECRET` | Kuzatish havolalarini imzolovchi barqaror tasodifiy kalit. O‘zgartirish eski havolalarni bekor qiladi. |
| `MAIL_PROVIDER` | `gmail` yoki `resend`. |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` | Google Cloud loyihasining OAuth web client rekvizitlari. |
| `GMAIL_REFRESH_TOKEN` | Jurnal Google hisobi rozilik berganidan keyin OAuth orqali olinadi. O‘ylab topilmaydi. |
| `GMAIL_SENDER` | OAuth orqali ruxsat bergan jurnalning Gmail manzili. |
| `RESEND_API_KEY`, `MAIL_FROM` | Resend API kaliti va tasdiqlangan domenning jo‘natuvchi manzili. Gmail tanlansa ishlatilmaydi. |
| `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET` | ORCID developer ilovasidan; sandbox va production hisoblari alohida. Callback: sayt manzili + `/api/orcid/callback`. |
| `ORCID_COOKIE_SECRET` | Operator yaratgan imzolash kaliti; berilmasa `ADMIN_PASSWORD` ishlatiladi. |
| `ZENODO_ACCESS_TOKEN` | Tanlangan Zenodo yoki Zenodo Sandbox hisobidagi personal access token. |
| `CROSSREF_USERNAME`, `CROSSREF_PASSWORD` | Crossref bergan depozit hisobi. DOI prefiksi jurnal sozlamalariga kiritiladi; tizim uni yaratmaydi. |
| `GOOGLE_SITE_VERIFICATION` | Google Search Console sayt egaligini tasdiqlash HTML tokeni; ixtiyoriy. |

Faylda kalit borligi uning kim tomonidan yoki qachon olinganini isbotlamaydi. Ulanish tekshiruvi kalitning kelib chiqish tarixini tasdiqlamaydi. `src/lib/data-store.ts` ichidagi qat’iy namunaviy IDlar avtomatik test fixture yozuvlaridir; ular haqiqiy DOI yoki ISSN emas.

## Tekshirish

```sh
npm run check:setup
npm run check:setup -- --online
npm test
npm run lint
npm run build
npm start
```

`check:setup` maxfiy qiymatlarni chiqarmaydi. `--online` 17 ta asosiy jadvalga o‘qish huquqini, 4 ta storage bucketning mavjudligi va maxfiyligini, jurnal sozlamasi hamda Gmail OAuth token olishni tekshiradi. Xat yubormaydi va bazaga yozmaydi. Tekshirilmagan xizmat uchun kalit mavjudligi ulanish tasdig‘i emas. Xato bo‘lsa buyruq `1` kodi bilan tugaydi; ixtiyoriy Crossref hisobi yo‘qligi jurnalni ishga tushirishni to‘xtatmaydi.

Yangi bazada `supabase/migrations/001_*.sql` dan `014_*.sql` gacha tartib bilan bajaring va boshlang‘ich sozlamalarni kiriting. Mavjud bazaga demo `seed.sql` yoki `FULL_SETUP.sql` faylini qayta yuklamang. Jadvalning o‘qilishi barcha SQL funksiyalar ishlashini tasdiqlamaydi; admin paneldagi amaliy oqimlarni ham tekshiring.

Mahalliy sayt: `http://localhost:3000/uz`. Admin: `http://localhost:3000/admin`. Parol `.env.local` ichidagi `ADMIN_PASSWORD`.

Gmail qayta ulanishi kerak bo‘lsa, Google Cloud OAuth web client JSON faylini `.data/gmail-client.json` ichiga saqlang, `npm run connect:gmail` ni bajaring va `http://localhost:53682` ni oching. OAuth client redirect manzili `http://localhost:53682/oauth2callback` bo‘lishi kerak. Google hisobining roziligisiz refresh token olinmaydi.

Hosting `.env.local` ni avtomatik olmaydi: qiymatlarni hosting loyihasining Environment Variables sozlamalariga kiriting, keyin qayta build/deploy qiling. Mahalliy tekshiruv hosting sozlanganini tasdiqlamaydi. Jonli saytda admin kirishi, qo‘lyozma yuborish, PDF yuklash, nashr, sertifikat va email yetib borishini alohida tekshiring.

ORCID/Zenodo sandbox kalitlari production xizmatiga mos kelmaydi. Production rejimini faqat tegishli haqiqiy hisob bilan yoqing: ORCID uchun `ORCID_PRODUCTION_ENABLED=true`, depozitlar uchun `INTEGRATION_PRODUCTION_ENABLED=true`. DOI va ISSN ro‘yxatdan o‘tkazish tegishli tashkilot orqali bajariladi.
