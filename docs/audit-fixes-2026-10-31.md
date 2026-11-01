# Audit tuzatishlarini ishga tushirish

Nashrdagi maqola o‘zgarmagan holda saqlansa, PDF va nashr holati saqlanadi. Iqtibos komponentiga faqat ommaviy bibliografik maydonlar yuboriladi. Audit xodimning tasdiqlangan sessiyasidan email, ID va rolni oladi; umumiy parol bilan kirish alohida belgilanadi. IP faqat ishonchli proksi sozlamasi bilan olinadi.

O‘zbekcha va ruscha maqolalarda inglizcha tarjima ixtiyoriy. Inglizcha asl maqolada uning inglizcha sarlavhasi, annotatsiyasi va kalit so‘zlari to‘ldiriladi. Tarjima yo‘qligi o‘zbekcha yoki ruscha maqolani nashr qilishga to‘sqinlik qilmaydi.

Supabase bazasida avvalgi migratsiyalardan keyin `supabase/migrations/017_issue_deletion_guard.sql` ni bajaring. U maqola biriktirilgan jurnal sonini o‘chirishni baza darajasida to‘xtatadi. Maqola va sonlarni o‘chirmaydi. API darajasidagi tekshiruv ham mavjud, lekin bir vaqtdagi so‘rovlardan himoya uchun migratsiya kerak. Bo‘sh sonlarni o‘chirish mumkin.

Bu o‘zgarishlar oldin o‘chirilgan son ma’lumotlarini yoki avval tozalangan PDF havolalarini avtomatik tiklamaydi. Tarixiy yozuvlar zaxira nusxa va versiyalar asosida alohida tekshiriladi.
