# Tahririyat hisoblari, taqriz va zaxira

## O‘rnatish

Avval 001–012, keyin `013_staff_and_reviews.sql` va
`014_content_backups.sql` qo‘llanadi. Ikkalasi birgalikda
`supabase/STAFF_BACKUP_UPGRADE.sql` faylida ham berilgan.
014 avvalgi pg_cron, pg_net va Vault sozlamalaridan foydalanadi.

## Alohida hisob va ikki bosqichli kirish

`/admin/staff` orqali bosh muharrir (`owner`), muharrir (`editor`) va taqrizchi
(`reviewer`) hisoblari taklif qilinadi. Email yuborish alohida tanlanadi.
Taklif havolasi maxfiy va bir martalik. Havola tokeni URL fragmentida keladi,
sahifa uni manzil satridan olib tashlaydi. Token serverga faqat parol formasi
yuborilganda beriladi. Parol kamida 12 belgi.

`/staff/security` sahifasida foydalanuvchi o‘z telefonidagi authenticatorni
ulaydi. Parol bilan kirishning o‘zi admin yoki taqriz ma’lumotlariga ruxsat
bermaydi: server tasdiqlangan Supabase Auth foydalanuvchisini, faol rolini va
`aal2` darajasini tekshiradi. QR yoki TOTP kalitini chat, git yoki logga yozmang.
Rollar server boshqaradigan jadvalda saqlanadi; foydalanuvchi metadata’sidan
olinmaydi. Browser Auth sessiyasiga bazaning eski editor RLS huquqlari berilmaydi.

`owner`: barcha boshqaruv, hisoblar, jurnal sozlamalari, audit va zaxiralar.
`editor`: nashr ishlari va taqriz biriktirish; hisoblar, zaxiralar, sozlamalar va
audit yopiq. Email navbati API xat matnlarini chiqarmaydi. `reviewer`: faqat
o‘ziga biriktirilgan topshiriqlar va qo‘lyozmalar.
Faolsizlantirilgan hisob mavjud sessiyasi bilan ham kira olmaydi.

Yangi bosh muharrir hisobiga parol va authenticator bilan muvaffaqiyatli
kirgach `/admin/staff` orqali umumiy parol kirishini o‘chiring. Bu amal faqat
MFA bilan kirgan `owner` uchun mavjud. `LEGACY_ADMIN_LOGIN=false` ham umumiy
kirishni yopadi. Dastlabki hisob faollashtirilmasdan bu parametrni o‘zgartirmang.
Yangi kirish havolasi mavjud MFA faktorlarini olib tashlamaydi. Telefon
yo‘qolganda shaxsni alohida tekshirish va Supabase administratorining tiklash
jarayoni kerak; zaxira authenticator imkoniyatlarini oldindan tayyorlang.

## Taqriz

`/admin/reviews`: nashrdan oldingi maqola, faol taqrizchi va muddat tanlanadi.
Muallif emaili taqrizchi emailiga teng bo‘lsa biriktirish rad etiladi.
Taqrizchi manfaatlar to‘qnashuvini tahririyatga bildirishi kerak; email
tengligini tekshirish barcha to‘qnashuvlarni aniqlamaydi.

`/reviewer`: tavsiya, muallif uchun xulosa va faqat tahririyat uchun maxfiy
izoh topshiriladi. Yakuniy taqriz qayta yozilmaydi. Muallif tracking sahifasiga
taqrizlar avtomatik chiqarilmaydi; muharrir `/admin/articles/{id}/edit`
orqali muallifga yuboriladigan xulosani tanlab yozadi. Maqola nashri ham
taqriz tavsiyasi bilan avtomatik o‘zgarmaydi. Qo‘lyozma ichida muallif nomi
bo‘lishi mumkin; anonim taqriz uchun muharrir faylni oldindan tayyorlashi kerak.

## Zaxira nusxalari

`/admin/backups` 14 ta kontent jadvali va `journal-pdfs`, `journal-manuscripts`,
`journal-covers` omborlarini maxfiy ZIPga yig‘adi. Har bir fayl SHA-256 bilan
tekshiriladi. ZIP qayta ochilib, jadvallar vaqtinchalik PostgreSQL jadvallariga
tiklanadi: ustun turlari, cheklovlar, noyob kalitlar va asosiy bog‘lanishlar
tekshiriladi. Jonli jadvallar almashtirilmaydi.

ZIP `journal-backups` maxfiy omborida saqlanadi, faqat `owner` yuklab oladi.
Unda muallif emaili va xususiy qo‘lyozmalar bor. Mustaqil, xavfsiz qurilmaga
ham nusxa yuklab saqlang. Bitta Supabase loyihasidagi nusxa provayderdan
mustaqil avariya zaxirasining o‘rnini bosmaydi.

`agm-daily-content-backup` har kuni 01:15 UTC (Moskva 04:15) ishlaydi.
Vault’da `agm_site_url=https://agmjoural.uz` va `agm_cron_secret` avval
sozlangan bo‘lishi kerak. `/api/cron/backups` Bearer CRON_SECRET talab qiladi.
Hozirgi onlayn limit: 48 MB ochilgan kontent, 1400 ombor fayli, 60 soniyalik
so‘rov. Hajm oshsa alohida backup worker va provayderning DB/storage backup
jarayoniga o‘ting; yarim nusxa muvaffaqiyatli deb belgilanmaydi.

Bu nusxa Auth parollari/MFA, Vault, outbox, request limits yoki infratuzilmani
o‘z ichiga olmaydi. Eski email navbatini tiklash takroriy xat yuborishi mumkin,
shu sabab outbox chiqarilmagan. To‘liq avariya tiklashi uchun alohida Supabase
Auth/DB provayder rejasi va xavfsiz saqlangan deployment konfiguratsiyasi kerak.
Vaqtinchalik jadvallar sinovi to‘liq yangi loyihaga tiklash sinovi emas.

## Tashqi xizmatlar

Crossref nashriyot hisobi/DOI prefiksi, rasmiy ISSN, antiplagiat shartnomasi va
Zenodo production tokeni foydalanuvchi tomonidan olinadi. Ular bo‘lmaguncha
productionga ulanganlik yoki indekslanganlik ko‘rsatilmaydi. `/integrations`
holatlari server konfiguratsiyasidan olinadi; kalit mavjudligi xizmat javobi
yoki a’zolik tasdig‘i emas. Admin integratsiya tekshiruvi alohida xizmatlarga
so‘rov yuborib ulanishni tekshiradi.

## 2026-10-22 tekshiruv natijasi

- 013 va 014 haqiqiy jurnal loyihasiga qo‘llandi. Cron’da email ishchisi
  har 5 daqiqada va kontent backup har kuni 01:15 UTC uchun faol.
- 181 avtomatik test, TypeScript, tanlangan ESLint va hosting production buildi o‘tdi.
- Alohida vaqtinchalik owner/editor/reviewer hisoblarida haqiqiy Supabase Auth
  paroli va TOTP bilan kirish mahalliy va production saytda sinovdan o‘tdi.
  Taqrizchi boshqa topshiriq/qo‘lyozmani ko‘ra olmadi; editor hisoblar va
  zaxiralarga kira olmadi; yakuniy taqriz qayta yuborilmadi; faolsizlantirilgan
  hisobning mavjud sessiyasi ham rad etildi. Vaqtinchalik hisoblar, qoralamalar
  va ularning fayllari o‘chirildi, haqiqiy maqolalar o‘zgartirilmadi.
- Bir martalik invite hamda recovery havolalari orqali parol belgilash
  vaqtinchalik hisobda tekshirildi. Recovery MFA faktorini o‘chirmaydi.
- Haqiqiy 14 jadval va 8 fayldan taxminan 10.7 MiB ZIP olindi, 22 ta yozuv/fayl
  SHA-256 bo‘yicha tekshirildi va vaqtinchalik PostgreSQL jadvallariga tiklandi.
  Mustaqil lokal nusxa ham `.data/backups` ichida saqlandi. Vault/Bearer orqali
  chaqirilgan production backup ishchisi ikkinchi tekshirilgan nusxani yaratdi.
- Mobil/desktop hisob sahifalari ko‘rib chiqildi; tekshirilgan login, activation,
  hisoblar va backup sahifalarida avtomatik WCAG A/AA auditi xato topmadi.
  Bu to‘liq qo‘lda accessibility sertifikatsiyasi emas.
- Bosh muharrirga faollashtirish xati yuborildi. Uning shaxsiy paroli va TOTP
  faktorini foydalanuvchi o‘zi belgilaydi. Shu kirish tasdiqlanmaguncha eski
  umumiy admin kirishi o‘chirilmaydi.
- Crossref/ISSN/antiplagiat uchun tashqi ruxsatlar hali olinmagan; Zenodo
  sandbox, ORCID production konfiguratsiyasida. Ochiq holat yorliqlari shu
  konfiguratsiyani aks ettiradi. Haqiqiy indekslanish yoki DOI berilganligi
  bu texnik tekshiruv bilan tasdiqlanmagan.
