/** Journal formatting choices, not formatting rules prescribed by Scopus. */
export const manuscriptStandard = {
  version: '1.0', date: '2026-10-25', font: 'Times New Roman', fontSize: 12,
  lineSpacing: 1.5, marginMm: 20, firstLineMm: 12.5,
} as const;

export const manuscriptStandardCopy = {
  uz: {
    summary: 'Yagona maqola shabloni: A4, Times New Roman 12, 1,5 interval, har tomondan 2 sm hoshiya. Maqolani o‘zbek, rus yoki ingliz tilida tayyorlang.',
    confirmation: 'Maqola jurnalning yagona shabloni va mualliflar yo‘riqnomasiga mos tayyorlanganini tasdiqlayman. Tahririyat format va ilmiy mazmunni alohida tekshiradi.',
    heading: 'Yagona shablon bo‘yicha qabul',
    policy: 'Qo‘lyozma jurnalning yagona shablonida tayyorlanadi: A4, asosiy matn Times New Roman 12, 1,5 qator oralig‘i, har tomondan 20 mm hoshiya, 12,5 mm birinchi qator chekinishi va raqamlangan sahifalar. Bir xil shablon o‘zbek, rus va ingliz tillarida beriladi. Sarlavha, mualliflarning to‘liq ismlari, tashkilotlari, mamlakatlari, mas’ul muallif emaili, annotatsiya, kalit so‘zlar, tadqiqot turiga mos asosiy bo‘limlar, deklaratsiyalar va adabiyotlar bo‘lishi kerak. DOCX yoki shablondan eksport qilingan PDF, 4 MB gacha qabul qilinadi. Taqriz uchun alohida anonim nusxa tayyorlang va yetkazishni tahririyat bilan kelishing. Muallif yuborishda shablonga muvofiqlikni tasdiqlaydi; tahririyat formatni, ilmiy dalillarni va etikani alohida baholaydi. Bu format jurnalning talabi bo‘lib, Scopus belgilagan shrift yoki sahifa qoidasi emas. Shablonga moslik nashrga qabul yoki indekslanish kafolati emas.',
  },
  en: {
    summary: 'One manuscript standard: A4, Times New Roman 12 pt, 1.5 line spacing and 20 mm margins. Prepare the manuscript in Uzbek, Russian or English.',
    confirmation: 'I confirm that the manuscript follows the journal template and author guidelines. The editors assess formatting and scientific content separately.',
    heading: 'Submission under the journal standard',
    policy: 'Prepare the manuscript using the journal template: A4, Times New Roman 12 pt body text, 1.5 line spacing, 20 mm margins, 12.5 mm first-line indentation and numbered pages. The same template is available in Uzbek, Russian and English. Include the title, full author names, affiliations, countries, corresponding email, abstract, keywords, study-appropriate body sections, declarations and references. Submit DOCX or a PDF exported from the template, up to 4 MB. Prepare a separate anonymised review copy and arrange delivery with the editors. Authors confirm template compliance when submitting; editors assess formatting, evidence and ethics separately. These are journal formatting choices, not typeface or page rules prescribed by Scopus. Compliance guarantees neither acceptance nor indexing.',
  },
  ru: {
    summary: 'Единый стандарт: A4, Times New Roman 12 пт, интервал 1,5 и поля 20 мм. Подготовьте рукопись на узбекском, русском или английском языке.',
    confirmation: 'Подтверждаю, что рукопись подготовлена по шаблону журнала и руководству для авторов. Редакция отдельно проверяет оформление и научное содержание.',
    heading: 'Подача по единому стандарту',
    policy: 'Используйте единый шаблон журнала: A4, основной текст Times New Roman 12 пт, интервал 1,5, поля 20 мм, отступ первой строки 12,5 мм и нумерация страниц. Один шаблон доступен на узбекском, русском и английском языках. Укажите название, полные имена авторов, организации, страны, почту ответственного автора, аннотацию, ключевые слова, основные разделы согласно типу исследования, декларации и литературу. Принимается DOCX или PDF, экспортированный из шаблона, до 4 МБ. Подготовьте отдельную обезличенную копию для рецензирования и согласуйте передачу с редакцией. При подаче автор подтверждает соответствие шаблону; редакция отдельно оценивает оформление, доказательства и этику. Это правила оформления журнала, а не требования Scopus к шрифту или страницам. Соответствие не гарантирует принятия или индексации.',
  },
} as const;
