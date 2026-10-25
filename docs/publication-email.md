# Nashr emaili va sertifikatlar

Maqola `published` bo‘lganda har bir muallifga sertifikat yaratiladi. Emaili
bor muallif o‘z sertifikati va maqola PDFini oladi. Emaili yo‘q muallifning
sertifikati mas’ul muallifga yuboriladi; hech kimda email bo‘lmasa sertifikat
admin panelda qoladi. Qayta saqlash mavjud sertifikat va xatlarni takrorlamaydi.
Oldin nashr qilingan maqolani qayta saqlash orqali ham bu jarayonni boshlash mumkin.

1. Supabase ishlatilsa `010_publication_emails.sql` migratsiyasini qo‘llang
   (avval 008 va 009 ham qo‘llangan bo‘lsin).
2. `.env.example` dagi email parametrlarini `.env.local` va hostingga kiriting.
3. `/admin/integrations` orqali ulanishni tekshiring va sinov xati yuboring.
4. `/admin/notifications` orqali navbat va xatoliklarni kuzating.
5. Scheduler `GET /api/cron/notifications` ni
   `Authorization: Bearer <CRON_SECRET>` bilan muntazam chaqirsin. Har safar
   30 tagacha xat qayta ishlanadi. Maqola saqlangach ham navbatdagi yuborish vaqti
   kelgan 30 tagacha xat qayta ishlanadi; avval yuborilgan xatlar takrorlanmaydi.

## Kuzatish, tahririyat izohi va email tiklash

`011_editorial_workflow.sql` izohlar jadvali, admin ogohlantirishlari va qayta
urinish vaqtini qo‘shadi. `012_notification_scheduler.sql` Supabase pg_cron
orqali worker'ni har 5 daqiqada chaqiradi. Supabase Vault’da `agm_site_url`
(`https://agmjoural.uz`) va hosting bilan bir xil `agm_cron_secret` mavjud
bo‘lsin. Vercel’dagi kunlik cron zaxira sifatida qoladi.

`TRACKING_SECRET` lokal va hostingda barqaror maxfiy kalit bo‘lsin. Muallifga
180 kunlik imzolangan kuzatish havolasi yuboriladi. Kalit almashtirilsa oldingi
havolalar bekor bo‘ladi. `/{lang}/track` orqali email va AGM-SUB raqami bilan
yangi havola so‘rash mumkin; mos kelish natijasi begona foydalanuvchiga
oshkor qilinmaydi. Izohlar faqat admin API orqali yoziladi, xususiy sahifada
ko‘rinadi va emailga yuboriladi. Ichki submission_notes bu sahifaga chiqmaydi.

Email xatosida bir marta adminga ogohlantirish navbatga qo‘shiladi; ogohlantirish
xatolari yangi ogohlantirishlar yaratmaydi. Xatolardan keyin qayta urinish
oralig‘i bir daqiqadan bir soatgacha oshadi. Noaniq Gmail natijasi avtomatik
takrorlanmaydi; Sent papkasini admin tekshiradi.

## Gmail

### Lokal ulanish yordamchisi

Google Cloud OAuth client JSON faylini `.data/gmail-client.json` sifatida
saqlang. OAuth client `Authorized redirect URIs` ro‘yxatiga
`http://localhost:53682/oauth2callback` qo‘shing. Testing rejimida Audience →
Test users ro‘yxatiga jurnal hisobini kiriting.

`node scripts/connect-gmail.mjs` ni ishga tushirib, oddiy brauzerda
`http://localhost:53682` ni oching. Jurnal hisobiga `gmail.send` ruxsatini
berganingizdan so‘ng yordamchi refresh token va Gmail sozlamalarini avtomatik
`.env.local` ga saqlaydi. Maxfiy kalitlar terminalga chiqarilmaydi. Yordamchi
ushbu jurnal uchun `agmjoural.editorial@gmail.com` manzilini ishlatadi.
Sayt serverini qayta ishga tushiring; hosting uchun o‘sha parametrlarni hosting
environment sozlamalariga ham kiriting. Yordamchi 30 daqiqadan so‘ng yopiladi.

### OAuth Playground orqali qo‘lda ulanish

Google Cloud loyihasida Gmail API ni yoqing, OAuth consent screen va OAuth
client yarating. Jurnalning Google hisobi bilan faqat
`https://www.googleapis.com/auth/gmail.send` scope uchun offline ruxsat olib,
refresh token yarating. OAuth Playground ishlatilsa o‘z client ID va client
secret'ingizni tanlang va uning redirect URI sini client sozlamasiga kiriting.
Parol yoki tokenlarni chatga va gitga joylamang.

```dotenv
MAIL_PROVIDER=gmail
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_SENDER=journal@gmail.com
```

`GMAIL_SENDER` ruxsat bergan jurnal hisobining email manzili bo‘lsin.
Sinov xati shu manzilning o‘ziga yuboriladi. OAuth consent screen `Testing`
holatida qolsa refresh token muddati cheklanishi mumkin; doimiy ishlatishdan
oldin Google talablari bo‘yicha publishing status va ruxsatlarni sozlang.

Gmail so‘rovi uzilsa, xat yuborilgan bo‘lishi mumkin. Bunday xat `unknown`
holatida qoladi va avtomatik qayta yuborilmaydi. Avval Gmail Sent papkasini
tekshiring. Xat hali yuborilayotgan bo‘lishi ham mumkin.

Rasmiy yo‘riqnomalar:
- https://developers.google.com/workspace/gmail/api/guides/sending
- https://developers.google.com/identity/protocols/oauth2/web-server#offline
- https://developers.google.com/oauthplayground/

## Resend

`MAIL_PROVIDER=resend`, `RESEND_API_KEY` va tasdiqlangan domenli `MAIL_FROM`
sozlanadi. Gmail manziliga xat olish uchun Gmail API ulash shart emas.

PDFlar navbatga base64 ko‘rinishida saqlanmaydi: faqat maqola va sertifikat
identifikatorlari saqlanadi. Yuborishda maqola hali nashrda, sertifikat esa
amalda ekani tekshiriladi. Ikkala PDFning jami hajmi 17 MB dan oshsa xat
xatolik bilan navbatda qoladi. Fayllar kichraytirilgach qayta yuborish mumkin.
Bu xizmat nashr haqidagi tayyor matnni yuboradi; kiruvchi xatlarni o‘qimaydi.
