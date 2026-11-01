# Google Search Console ulanishi

Google Gmail uchun berilgan `gmail.send` ruxsati Search Console xizmatini boshqarmaydi. Alohida Google roziligi kerak. Google paroli chatga yoki ilovaga kiritilmaydi.

1. Google Cloud loyihasida Search Console API’ni yoqing. Mavjud web OAuth client uchun `http://localhost:53682/oauth2callback` redirect manzili ruxsat etilgan bo‘lsin. Testing rejimida jurnal Google hisobini test foydalanuvchilariga qo‘shing.
2. Lokal mashinada `npm run connect:search-console` ni bajaring va ko‘rsatilgan localhost havolasini oching. Jurnal saytini boshqaradigan Google hisobida rozilik bering. PKCE va bir martalik state bilan himoyalangan ulanish 30 daqiqada tugaydi. Mavjud Gmail tokeni almashtirilmaydi.
3. `SEARCH_CONSOLE_CLIENT_ID`, `SEARCH_CONSOLE_CLIENT_SECRET`, `SEARCH_CONSOLE_REFRESH_TOKEN` qiymatlari `.env.local` ga maxfiy saqlanadi. Ularni production hostingning maxfiy environment variables bo‘limiga ham joylang va qayta deploy qiling. Chatga yoki Git’ga yubormang.
4. `/admin/integrations` da “Sitemap’ni Google’ga yuborish” va “Google indeks holatini tekshirish” tugmalaridan foydalaning. Bu amallar bosh muharrir hisobiga ruxsat etilgan. Domen yoki URL-prefix mulki Google hisobida tasdiqlangan va to‘liq boshqaruv huquqiga ega bo‘lishi kerak.

Google URL Inspection API indeksdagi joriy holatni o‘qiydi. U live crawl yoki “Request indexing” amalini bajarmaydi. Sitemap topshirish indekslashni kafolatlamaydi. Ilmiy maqolalar uchun JobPosting/BroadcastEvent sahifalariga mo‘ljallangan Google Indexing API ishlatilmaydi.

Rasmiy manbalar:
- https://developers.google.com/webmaster-tools/v1/sites/list
- https://developers.google.com/webmaster-tools/v1/sitemaps/submit
- https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
