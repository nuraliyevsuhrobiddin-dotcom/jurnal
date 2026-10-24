# Nashr sifati tekshiruvi — 2026-10-24

## Tuzatishlar

- DOCX’da keyinroq uchragan “Results” yoki “Methods” paragrafi sabab oldingi ilmiy matn o‘chib ketishi bartaraf etildi. Muqovada aynan takrorlangan boshlang‘ich metama’lumotlargina chiqarib tashlanadi.
- Qalin shrift bilan ajratilgan so‘z bo‘laklari orasiga sun’iy bo‘shliq qo‘shilmaydi; asl bo‘shliqlar saqlanadi.
- Asosiy matnning birinchi paragrafi sarlavha sifatida kattalashtirilmaydi. Bo‘lim sarlavhalari uchun sahifa oxirida joy tekshiriladi.
- Word nashrining asosiy betlarida jurnal sahifa raqamlari ko‘rsatiladi. Muqova axborot varag‘i asosiy matn sahifalari hisobiga kirmaydi.
- Uzun jurnal nomlari va DOI satrlari ajratilgan joyga sig‘diriladi; muqova sarlavhasi bir xil o‘lchamda satrlarga bo‘linadi.
- Yuqori/pastki indeks, maxsus Word belgisi yoki matn qutisi bor DOCX avtomatik soddalashtirilmaydi. Bunday faylni Word’dan PDF qilib yuklash kerak.
- Muallif tayyorlagan PDF uchun ham jurnal sahifa diapazoni haqiqiy betlar soniga mosligi tekshiriladi.
- Yangi nashr yoki sahifa diapazonini o‘zgartirishda shu sondagi nashr etilgan maqolalar bilan sahifalar kesishishi bloklanadi. Bu dastur darajasidagi tekshiruv; bir vaqtning o‘zida parallel nashrlarni bazada atomar rezervlash mexanizmi emas. Eski yozuvlarni faqat metama’lumotlari bo‘yicha tahrirlashga to‘sqinlik qilmaydi.

## Tekshirilgan narsalar

- Testlar: maqola hayot sikli, PDF/DOCX, sertifikat, jurnal to‘plami, email, metama’lumotlar va boshqa mavjud tekshiruvlar.
- Production build, TypeScript va ESLint muvaffaqiyatli o‘tdi. Yakuniy tekshiruvda 207 ta test o‘tdi; mahalliy `.data` yordamchi fayllari lint doirasidan chiqarildi.
- `npm run check:setup -- --online`: baza jadvallariga o‘qish huquqi, fayl omborlari maxfiyligi, jurnal sozlamalari va Gmail OAuth tekshirildi; xat jo‘natilmadi.
- Mavjud maqola sahifasi desktop va 390 px mobil ekranda ko‘rildi. Mobil hujjat kengligi 390 px: gorizontal toshish kuzatilmadi.
- Mavjud maqolaning PDF havolasi ishladi; fayl 6 ta A4 betdan iborat.
- Sun’iy namunaviy Word maqoladan 3 betli PDF tayyorlanib ko‘rildi: muqova va 2 bet asosiy matn. Dastlabki/yakuniy matn hamda format bo‘laklariga bo‘lingan so‘z saqlanishi alohida tekshirildi.

## Mavjud kontentda qolgan tahririy ishlar

Quyida dastlabki tahririy topilmalar saqlangan. Yakuniy bosqichda matnlar taqqoslanib, “FIRST GRAD” nusxasi arxivga, boshqa mualliflarga tegishli `bmc-biology` qoralamaga o‘tkazildi; hech qanday fayl o‘chirilmadi. Avval zaxira olindi va audit yozildi. Endi nashr etilgan yagona maqola sahifalari 1–6; sahifalar kesishishi yo‘q. `XXX` o‘rnidagi haqiqiy ism va tuzatilgan manba PDF hali kerak.

1. `submitted-d9032abb-2755-4954-891a-0cc5a290d395` va `submitted-e9b7c50f-a998-45c2-b57c-dc397e35c177` sarlavhalari deyarli bir xil. Ikkinchi sarlavha “FIRST GRAD” bilan tugaydi. Bularning alohida maqola yoki takroriy yuklash ekanini aniqlash kerak.
2. Ikkala yozuvning muallif nomida `XXX` bor; ilmiy nashrdan oldin ism-sharifni tasdiqlash kerak.
3. Birinchi yozuv sahifalari 1–6, ikkinchisiniki 1–5, `bmc-biology` yozuviniki 1–22. Ularning bir son ichidagi yakuniy ketma-ket sahifalarini belgilash va tegishli PDF’larni qayta tayyorlash kerak.
4. Crossref foydalanuvchi nomi va paroli sozlanmagan. DOI ro‘yxatdan o‘tkazish imkoniyati tasdiqlanmadi. ORCID va Zenodo uchun faqat kalitlar mavjudligi tekshirildi.

## Qanday natija kutiladi

Oddiy matnli DOCX jurnal muqovasi va tartibli A4 asosiy matn bilan chiqariladi. Muallif yuklagan PDF o‘zining maketi, formulalari va rasmlari bilan saqlanadi; u avtomatik ravishda Word shabloniga qayta terilmaydi. Shu sabab bunday PDF’ni nashrdan oldin tahririyat ko‘rib chiqishi kerak. Sarlavha, muallif, sana, DOI yoki sahifalar o‘zgarsa, Word’dan tayyorlangan PDF’ni ham qayta yaratib, tekshirish lozim.

Mahalliy ko‘rish fayllari: `artifacts/publication-review/sample-article.pdf`, `page-1.png`, `page-2.png`, `page-3.png`, `article-desktop.png`, `article-mobile.png`. Namuna ilmiy dalil yoki haqiqiy nashr emas. Ishlab turgan saytga deploy qilinmadi.
