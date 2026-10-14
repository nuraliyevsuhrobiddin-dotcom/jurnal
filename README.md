# AGM JOURNAL — XALQARO ELEKTRON ILMIY JURNAL PLATFORMASI

**AGM Journal** — zamonaviy ilmiy nashriyot standartlari, xalqaro akademik integratsiya (Google Scholar, Crossref, DOAJ, COPE) va ochiq fan (Open Access CC BY 4.0) tamoyillari asosida noldan ishlab chiqilgan to‘liq ilmiy jurnal boshqaruv tizimi.

---

## 🚀 ASOSIY IMKONIYATLAR

1. **Uch tilli tizim (i18n)**:
   - O‘zbekcha: `/uz/`
   - Inglizcha: `/en/`
   - Ruscha: `/ru/`
   - Har bir maqola uchun alohida `title_uz`, `title_en`, `title_ru` hamda `abstract_uz`, `abstract_en`, `abstract_ru`.

2. **To‘liq ommaviy sahifalar (21 ta sahifa)**:
   - Bosh sahifa (`/[lang]`)
   - Jurnal haqida (`/[lang]/about`)
   - Barcha maqolalar katalogi (`/[lang]/articles`) — qidiruv va filtrlash bilan
   - Maqola sahifasi (`/[lang]/article/[slug]`) — to‘liq bibliografik ma’lumotlar, annotatsiya, PDF yuklab olish, iqtibos generatsiyasi (APA, MLA, Chicago, BibTeX)
   - Joriy jurnal soni (`/[lang]/current`)
   - Jurnal sonlari arxivi (`/[lang]/archive`)
   - Tahririyat hay‘ati (`/[lang]/editorial-board`)
   - Mualliflar uchun talablar (`/[lang]/guidelines`)
   - Taqriz siyosati (`/[lang]/peer-review`)
   - Nashr etikasi (`/[lang]/ethics`)
   - Plagiat siyosati (`/[lang]/plagiarism`)
   - Ochiq kirish litsenziyasi (`/[lang]/open-access`)
   - Nashr to‘lovlari (`/[lang]/apc`)
   - Indekslash haqida ma’lumot (`/[lang]/indexing`)
   - Aloqa sahifasi (`/[lang]/contact`)
   - Maxfiylik siyosati (`/[lang]/privacy`)
   - Foydalanish shartlari (`/[lang]/terms`)
   - Sertifikatni tekshirish portali (`/verify-certificate`)
   - Doimiy sertifikat sahifasi (`/certificate/[code]`)
   - 404 sahifasi (`/_not-found`)

3. **Admin Panel (`/admin`)**:
   - **Dashboard**: Jami maqolalar, draftlar, tekshiruvdagilar, tasdiqlangan va nashr etilgan maqolalar, sonlar va sertifikatlar statistikasi.
   - **Maqola kiritish (`/admin/articles/new`)**: 3 tildagi sarlavha va annotatsiyalar, cheklanmagan mualliflar ro‘yxati (tashkilot, ORCID, mas’ul muallif), DOCX yuklab avtomatik to‘ldirish.
   - **Maqolalarni boshqarish (`/admin/articles`)**: Holatlar oqimi: `draft` ➔ `under_review` ➔ `approved` ➔ `published`.
   - **Jurnal sonlari (`/admin/issues`)**: Jildlar, sonlar, nashr sanasi, joriy sonni belgilash.
   - **Sertifikatlar reestri (`/admin/certificates`)**: Mualliflik sertifikatlarini chiqarish, QR-kod yaratish, bekor qilish (revocation).
   - **DOCX va PDF generatori (`/admin/pdf-generator`)**: Word fayllarini tahlil qilish, titul sahifalari.
   - **Audit va xavfsizlik (`/admin/audit-logs`)**: Administrator harakatlarining to‘liq xronologiyasi.
   - **Jurnal sozlamalari (`/admin/settings`)**: Jurnal nomi, ISSN, aloqa ma’lumotlari va DOI prefiksi.

4. **Avtomatik PDF va QR sertifikatlar**:
   - `pdf-lib` orqali xalqaro standartdagi mualliflik sertifikati PDF formati dinamik shakllanadi.
   - Har bir sertifikatda betakror raqam (masalan, `AGM-CERT-2026-000101`) va verifikatsiya kodi mavjud.
   - QR-kod orqali kameradan skaner qilganda to‘g‘ridan-to‘g‘ri `/certificate/[code]` tekshiruv sahifasi ochiladi.

5. **Google Scholar & Ilmiy SEO**:
   - Har bir maqolada maxsus Google Scholar metateglari:
     - `citation_title`
     - `citation_author` (har bir muallif uchun alohida)
     - `citation_publication_date`
     - `citation_journal_title`
     - `citation_volume`
     - `citation_issue`
     - `citation_firstpage`, `citation_lastpage`
     - `citation_doi`
     - `citation_pdf_url`
   - Canonical URL va 3 tildagi `hreflang` havolalari.
   - Dinamik XML sitemap (`/sitemap.xml`) va `robots.txt`.
   - JSON-LD `ScholarlyArticle` structured data.

6. **Supabase Database & Xavfsizlik**:
   - SQL migratsiya fayli: `supabase/migrations/001_initial_schema.sql`
   - Boshlang‘ich ilmiy ma’lumotlar: `supabase/seed.sql`
   - Jadvallar: `profiles`, `issues`, `articles`, `article_authors`, `article_files`, `editorial_board`, `certificates`, `journal_settings`, `audit_logs`.
   - Row Level Security (RLS) yoqilgan: ommaga faqat nashr qilingan maqolalar ko‘rinadi, qoralamalar va audit loglar himoyalangan.

---

## 🛠 TEXNOLOGIK STACK

- **Framework**: Next.js 16 (App Router)
- **Til**: TypeScript (strict mode)
- **Dizayn**: Tailwind CSS, Lucide Icons
- **Database & Auth**: Supabase PostgreSQL, Row Level Security (RLS)
- **PDF & QR**: `pdf-lib`, `qrcode`, `mammoth` (DOCX parsing)
- **Validatsiya**: Zod
- **Testlar**: Vitest

---

## 💻 O‘RNATISH VA ISHGA TUSHIRISH

### 1. Bog‘liqliklarni o‘rnatish:
```bash
npm install
```

### 2. Muhit o‘zgaruvchilarini sozlash:
`.env.example` faylidan nusxa olib `.env.local` yarating:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-secret-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LOCALE=uz
```

### 3. Ma’lumotlar bazasini yuklash:
Supabase Dashboard SQL Editor oynasida avval sxema migratsiyalarini raqamlar tartibida, har birini alohida ishga tushiring:
1. `supabase/migrations/001_initial_schema.sql` — asosiy jadvallar, jumladan `journal_settings` jadvali
2. `supabase/migrations/002_runtime_operations.sql` — runtime funksiyalari va storage sozlamalari
3. `supabase/migrations/003_manuscript_submissions.sql` — qo‘lyozma yuborish funksiyalari
4. `supabase/migrations/004_editorial_board_management.sql` — tahririyat ro‘yxatining indeksi va yangilanish triggeri
5. `supabase/migrations/005_issue_updates.sql` — jurnal sonlarini xavfsiz tahrirlash amali
6. `supabase/migrations/006_issue_cover_storage.sql` — ommaviy jurnal muqovalari uchun storage bucket
7. `supabase/seed.sql` — demo sozlamalari va boshlang‘ich ma’lumotlar

`seed.sql` faylini migratsiyalardan oldin ishlatmang. U majburiy jadvallar yo‘qligini tekshiradi va kerak bo‘lsa, bajarilishi kerak bo‘lgan migratsiyalarni ko‘rsatib to‘xtaydi.

Supabase ulanmagan mahalliy serverda ma’lumotlar `.data/journal.json`, maqola PDF fayllari `.data/articles/` ichida saqlanadi va server qayta ishga tushganda tiklanadi. Bu rejim bitta doimiy diskli server uchun mo‘ljallangan. Vercel va boshqa serverless hostingda Supabase kerak; vaqtinchalik disk doimiy saqlashni ta’minlamaydi.

`002_runtime_operations.sql` migratsiyasi maqola va mualliflarni bitta amalda saqlash funksiyasi, joriy sonni almashtirish amali, murojaatlar jadvali hamda yopiq `journal-pdfs` bucketini yaratadi. Server yozish amallari uchun `SUPABASE_SERVICE_ROLE_KEY` kerak. Ulanishda xato bo‘lsa, tizim boshqa demo ma’lumotlariga yashirin o‘tmaydi.

Jurnal soni formasidan muqova faylini yuklash uchun `006_issue_cover_storage.sql` migratsiyasini bajaring. Muqovalar 5 MB gacha bo‘lgan JPG, PNG yoki WebP formatida qabul qilinadi va ommaviy `journal-covers` bucketida saqlanadi; yuklash API’si admin sessiyasi hamda `SUPABASE_SERVICE_ROLE_KEY` talab qiladi.

Production rejimda `ADMIN_PASSWORD` belgilang. Admin va uning API manzillari imzolangan, 8 soatlik HttpOnly cookie bilan himoyalanadi. Mahalliy development rejimida parol sozlanmagan bo‘lsa panel ochiq; parol berilsa kirish talab qilinadi. Parol o‘zgartirilsa eski sessiyalar bekor bo‘ladi.

Aloqa formasi xabarlarni saqlaydi; admin `/admin/messages` sahifasida ularni ko‘radi. Email jo‘natish xizmati ulanmagan. `/admin/pdf-generator` sahifasida maqola tanlab, 20 MB gacha PDF yuklash, jurnal titul sahifasini qo‘shish va to‘liq faylni saqlash mumkin. PDF yuklanmagan boshlang‘ich maqolalarda faqat titul sahifasi yaratiladi.

Nizom va tahririyat siyosatlari `/{lang}/policies` markazida jamlangan. 16 ta hujjat o‘zbek, ingliz va rus tillarida yozilgan; har biri alohida PDF yoki to‘liq qo‘llanma sifatida yuklanadi. PDF A4 formatida, Unicode matn, mundarija, sahifa raqami, versiya, sana va QR tekshiruvga ega. Dumaloq belgi jurnalning elektron nashr belgisi; u rahbar imzosi yoki rasmiy tasdiqlash qarorini da’vo qilmaydi. Hujjat matni `src/lib/policy-content.ts`, versiya va tahrir sanasi `src/types/policies.ts` ichida boshqariladi. Mazmun yoki jurnal rekvizitlari o‘zgarsa, avvalgi QR mazmun identifikatori joriy hujjatga mos kelmasligi ko‘rsatiladi.

Muallif `/{lang}/submit` shaklida PDF/DOCX qo‘lyozmasini yuboradi. Fayl yopiq saqlanadi, maqola qoralama sifatida admin ro‘yxatiga tushadi. Muharrir `/admin/articles/{id}/edit` orqali metama’lumotlarni to‘ldirib, ish holatini boshqaradi va qo‘lyozmani yuklab oladi. Yuborish avtomatik qabul yoki email xabarnomasini anglatmaydi. Mahalliy fayllar `.data/manuscripts/` ichida; Supabase uchun `supabase/migrations/003_manuscript_submissions.sql` migratsiyasini ham bajaring. `.data` katalogini zaxiralash va email xizmatini ulash server operatorining vazifasidir.

ISSN maydonida nazorat raqami noto‘g‘ri bo‘lsa ommaviy sahifa, PDF va metama’lumotlarda tasdiqlangan identifikator sifatida ko‘rsatilmaydi. Nazorat raqamining to‘g‘riligi ham ro‘yxatdan o‘tganlikni isbotlamaydi. Scopus/DOAJ, DOI ro‘yxati va to‘lov shartlari faqat amaldagi tasdiqlovchi ma’lumotlar asosida yangilanadi.

### 4. Dasturni ishga tushirish:
```bash
npm run dev
```
Sayt `http://localhost:3000/uz` manzilida ochiladi.
Admin panel: `http://localhost:3000/admin`

---

## 🧪 TESTLARNI ISHGA TUSHIRISH

Vitest orqali barcha unit va integratsiya testlarini tekshirish:
```bash
npm test
```

Production build tekshiruvi:
```bash
npm run build
```

---

## 🌐 VERCEL DEPLOYMENT QO‘LLANMASI

1. Loyihani GitHub reponizga push qiling (`git push origin main`).
2. [Vercel](https://vercel.com) ga kiring va "New Project" ni bosing.
3. Reponi tanlang va "Environment Variables" bo‘limiga quyidagilarni kiriting:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (masalan: `https://agmjoural.uz`)
   - `NEXT_PUBLIC_DEFAULT_LOCALE` (`uz`)
   - `ADMIN_PASSWORD`
4. **Deploy** tugmasini bosing. Loyiha Vercel serverless platformasida avtomatik ravishda quriladi va nashr etiladi.

## Production: agmjoural.uz

GitHub repository: https://github.com/nuraliyevsuhrobiddin-dotcom/jurnal

Set `NEXT_PUBLIC_SITE_URL=https://agmjoural.uz` in hosting environment variables before building. Configure all Supabase keys and a unique `ADMIN_PASSWORD` privately; `.env.example` contains no credentials. Run migrations 001?007 and then seed.sql. Hosted Supabase operations fail explicitly on database/schema errors and never write journal JSON to the local filesystem. Vercel requires Supabase credentials.

Connect the purchased domain to the hosting project and apply the DNS records supplied by the host. Verify HTTPS, login, manuscript submission, PDF storage, issue publishing, and certificate downloads on the deployed site. Domain ownership alone does not deploy the application. Email delivery is not configured. Do not run demo seed content over existing production records without reviewing it first.

If production logs report `permission denied for table`, run `supabase/migrations/007_service_role_permissions.sql` in the configured Supabase project SQL Editor as postgres. This grants access only to the server service_role; it does not disable RLS. Migration 003 provisions private manuscript storage. FULL_SETUP.sql combines migrations 001?007 and demo seed data for a new database; use the individual migrations for an existing database.
