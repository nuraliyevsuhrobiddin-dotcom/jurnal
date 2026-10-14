import type { Language } from '@/types/journal';

export const policyLabels = {
  uz: { hub: 'Jurnal hujjatlari va siyosatlari', intro: 'Mualliflar, taqrizchilar va o‘quvchilar uchun nashr tartibi, huquqlar va mas’uliyatlar.', download: 'PDF yuklab olish', print: 'Chop etish', contents: 'Mundarija', version: 'Versiya', date: 'Tahrir sanasi', publisher: 'Nashriyot', sources: 'Me’yoriy manbalar', contact: 'Tahririyat bilan bog‘lanish', edition: 'Elektron nashr', verify: 'Hujjatni tekshirish', handbook: 'To‘liq qo‘llanma · PDF', all: 'Barcha siyosatlar', groups: ['Jurnal va boshqaruv', 'Mualliflar va nashr jarayoni', 'Ilmiy halollik', 'Ochiqlik va huquqlar'], read: 'Hujjatni o‘qish', submit: 'Maqola yuborish' },
  en: { hub: 'Journal documents & policies', intro: 'Publication procedures, rights and responsibilities for authors, reviewers and readers.', download: 'Download PDF', print: 'Print', contents: 'On this page', version: 'Version', date: 'Revision date', publisher: 'Publisher', sources: 'Reference standards', contact: 'Contact the editorial office', edition: 'Electronic edition', verify: 'Verify document', handbook: 'Complete handbook · PDF', all: 'All policies', groups: ['Journal & governance', 'Authors & publication', 'Research integrity', 'Access & rights'], read: 'Read document', submit: 'Submit a manuscript' },
  ru: { hub: 'Документы и политики журнала', intro: 'Порядок публикации, права и обязанности авторов, рецензентов и читателей.', download: 'Скачать PDF', print: 'Печать', contents: 'Содержание', version: 'Версия', date: 'Дата редакции', publisher: 'Издатель', sources: 'Нормативные источники', contact: 'Связаться с редакцией', edition: 'Электронное издание', verify: 'Проверить документ', handbook: 'Полное руководство · PDF', all: 'Все политики', groups: ['Журнал и управление', 'Авторам и публикация', 'Научная добросовестность', 'Доступ и права'], read: 'Читать документ', submit: 'Подать рукопись' },
} satisfies Record<Language, object>;

export const policyGroups = [
  ['journal-charter', 'about', 'indexing', 'complaints'],
  ['guidelines', 'peer-review', 'apc', 'archiving'],
  ['ethics', 'plagiarism', 'corrections', 'data-policy', 'ai-policy'],
  ['open-access', 'privacy', 'terms'],
] as const;

export const policyTitles = {
 uz: ['Jurnal nizomi', 'Jurnal haqida', 'Mualliflar uchun qo‘llanma', 'Taqrizlash tartibi', 'Nashr etikasi', 'Plagiat siyosati', 'Ochiq kirish', 'Nashr to‘lovlari', 'Indekslash', 'Shikoyat va apellyatsiyalar', 'Tuzatish va qaytarib olish', 'Tadqiqot ma’lumotlari', 'Sun’iy intellekt siyosati', 'Arxivlash', 'Maxfiylik siyosati', 'Foydalanish shartlari'],
 en: ['Journal charter', 'About the journal', 'Author guidelines', 'Peer review', 'Publication ethics', 'Plagiarism policy', 'Open access', 'Publication fees', 'Indexing', 'Complaints & appeals', 'Corrections & retractions', 'Research data', 'Artificial intelligence', 'Archiving', 'Privacy policy', 'Terms of use'],
 ru: ['Устав журнала', 'О журнале', 'Руководство для авторов', 'Рецензирование', 'Публикационная этика', 'Политика плагиата', 'Открытый доступ', 'Публикационные сборы', 'Индексация', 'Жалобы и апелляции', 'Исправления и ретракции', 'Данные исследований', 'Искусственный интеллект', 'Архивирование', 'Конфиденциальность', 'Условия использования'],
} satisfies Record<Language, string[]>;
