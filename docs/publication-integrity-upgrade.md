# Nashr yaxlitligi va versiyalar yangilanishi

## Tartib

1. Amaldagi bazaning tekshirilgan zaxira nusxasi mavjudligini tekshiring.
2. `supabase/migrations/015_publication_integrity.sql` ni SQL huquqi bor Supabase ulanishi orqali bajaring.
3. `supabase/migrations/016_versioned_backups.sql` ni bajaring.
4. `node scripts/check-publication-upgrade.mjs` bilan yangi ustunlar, katalog, to‘plamlar, versiyalar va zaxira funksiyalarini tekshiring. Bu buyruq yozuvlarni o‘zgartirmaydi va maxfiy qiymatlarni chiqarmaydi.
5. `npm test`, `npm run lint`, `npm run build` tekshiruvlari o‘tgan versiyani Vercel production muhitiga chiqaring. Baza yangilanmaguncha yangi deploymentni asosiy domenga o‘tkazmang.

Supabase service-role kaliti mavjud jadvallardagi amallar uchun yetadi, ammo boshqaruv API orqali SQL migratsiyasini bajarish huquqini bermaydi. Buning uchun hisob egasining Supabase boshqaruv ulanishi yoki SQL Editor kerak.

## Natijadagi ish tartibi

- `/admin/collections`: har bir son va yo‘nalish uchun maqolalar soni, 25 talik chegara va ochilish sanasi.
- To‘plam bir marta 25 ta nashrga yetib ochilgach, maqolalar soni kamayganda ham ochilgan holati saqlanadi. Qaytarib olingan maqola ro‘yxatlarda tavsiya qilinmaydi, uning doimiy sahifasi va sababi saqlanadi.
- Katalogning qidiruvi, jami soni va sahifalashi bazada bajariladi. Bevosita maqola sahifalari va indekslash to‘plam ochilishini kutmaydi.
- Nashrdan oldin barcha tillardagi ishlar uchun inglizcha sarlavha, annotatsiya va kalit so‘zlar talab qilinadi. Muallifning to‘liq maqolasini tarjima qilish majburiy emas.
- Maqola tahririda nashr oldi tekshiruv oynasi, inglizcha metadata maydonlari va ommaviy tuzatish izohi mavjud.
- Har bir saqlashda maqola versiyasi tekshiriladi. Boshqa muharrir o‘zgartirgan eski nusxa bilan yozish rad etiladi. Jurnal sahifalari diapazonlari bazadagi cheklov bilan takrorlanishdan himoyalanadi.
- Maqola tahriri ostida oldingi versiyalar va PDF yuklash havolalari bor. PDF almashganda avvalgi fayl ustiga yozilmaydi; eski nusxa faqat tahririyatga ochiq qoladi.
- Ommaviy maqola sahifasida nashr etilgan oldingi versiyalarning sana va tuzatish tarixi ko‘rsatiladi. Taqriz fayllari, shaxsiy yozishmalar va eski PDFlar ommaga chiqarilmaydi.
- Nashr tarixiga ega maqolani o‘chirib bo‘lmaydi; izoh bilan qaytarib olish amali qo‘llanadi.
- Sertifikat sahifasi va PDFi maqolaning joriy holati hamda muallif/sarlavha/son/sana mosligini tekshiradi. Nashr vaqtincha yopilgan yoki ma’lumoti o‘zgargan sertifikat nashr tasdig‘i sifatida berilmaydi. Metadata yangilanib qayta nashr qilinganda yangi sertifikat berilib, oldingisi izoh bilan bekor qilinadi.
- Zaxira nusxasiga versiyalar va to‘plam ochilish holatlari ham kiradi. Admin panel 36 soatdan eski zaxira, muvaffaqiyatsiz avtomatik urinish va 48 MB chegarasiga yaqinlashish haqida ogohlantiradi.

## Chegaralar

Migratsiya avvalgi PDFlarni qayta yasamaydi. Versiyalar tarixi yangilanishdan keyingi tahrirlarni saqlaydi; undan oldin ustiga yozilgan fayllarni tiklash uchun eski zaxira kerak.

Jurnalning haqiqiy Crossref DOI hisobi, Google Search Console tasdig‘i va tashqi indekslarga qabul holati alohida xizmatlarda boshqariladi. Dastur ularni mavjud bo‘lmagan holda tasdiqlangan deb ko‘rsatmaydi.
