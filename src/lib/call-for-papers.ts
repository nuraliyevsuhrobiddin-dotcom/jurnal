import type { Language } from '@/types/journal';

const content = {
  uz: {
    title: 'AXBOROT XATI', subtitle: 'Ilmiy maqolalar uchun ochiq taklif',
    intro: 'AGM Journal tadqiqotchilar, professor-o‘qituvchilar, doktorantlar va talabalarni o‘z ilmiy natijalarini nashr uchun taqdim etishga taklif qiladi. Jurnalning yangi soni har oy nashr etiladi.',
    sections: [
      ['Yo‘nalishlar', 'Ko‘p tarmoqli ilmiy tadqiqotlar: tabiiy va aniq fanlar, texnologiyalar, iqtisodiyot, pedagogika hamda ijtimoiy-gumanitar fanlar. Mavzuning jurnal doirasiga mosligi tahririyat tomonidan baholanadi.'],
      ['Maqola talablari', 'Original va ilgari nashr qilinmagan maqola; aniq sarlavha, muallif va tashkilot ma’lumotlari, annotatsiya, kalit so‘zlar, tadqiqot usuli va natijalari, xulosa hamda adabiyotlar ro‘yxati. Manbalarga havola bering va barcha hammualliflarning roziligini oling.'],
      ['Til va fayl formati', 'O‘zbek, ingliz va rus tillaridagi maqolalar qabul qilinadi. PDF yoki DOCX fayl, 20 MB gacha. Nashr uchun yakuniy fayl tahririyat talablari asosida tayyorlanadi.'],
      ['Nashr tartibi', 'Maqola yuborish → dastlabki tahririy tekshiruv → taqriz → muallif tuzatishlari → nashr qarori. Yuborish maqolaning qabul qilinganini anglatmaydi. Har oy yangi son; aniq son va nashr sanasi tahririyat qaroridan so‘ng belgilanadi.'],
      ['Nashr to‘lovi', 'Talabalar uchun: 100 000 so‘m. Boshqa mualliflar uchun amaldagi to‘lov va to‘lov tartibi tahririyat bilan aniqlashtiriladi. To‘lov maqola qabul qilinishini yoki ijobiy taqrizni kafolatlamaydi.'],
      ['Muallifga taqdim etiladi', 'Nashr etilgan maqolaning doimiy sahifasi, jurnal rekvizitlari bilan PDF fayli va nashr sertifikati. Sertifikatning haqiqiyligi jurnalning onlayn reestri orqali tekshiriladi.'],
    ], submit: 'Maqola yuborish', contact: 'Tahririyat bilan aloqa',
  },
  en: {
    title: 'CALL FOR PAPERS', subtitle: 'An invitation to share your research',
    intro: 'AGM Journal invites researchers, lecturers, doctoral candidates and students to submit original research. A new journal issue is published every month.',
    sections: [
      ['Research areas', 'Multidisciplinary research in natural and exact sciences, technology, economics, education, social sciences and humanities. The editorial office evaluates whether each manuscript fits the journal scope.'],
      ['Manuscript requirements', 'Original, previously unpublished research with a clear title, author affiliations, abstract, keywords, methods, results, conclusion and references. Cite sources and obtain consent from all co-authors.'],
      ['Languages and files', 'Uzbek, English and Russian. Submit a PDF or DOCX file up to 20 MB. Prepare the final publication file according to the editorial guidelines.'],
      ['Editorial process', 'Submission → initial editorial screening → peer review → revisions → publication decision. Submission is not acceptance. New issues appear monthly; issue assignment and publication date follow the editorial decision.'],
      ['Publication fee', 'Students: UZS 100,000. Other authors should contact the editorial office for applicable fees and payment procedures. Payment does not guarantee acceptance or a favourable review.'],
      ['Publication materials', 'A permanent article page, a PDF with journal publication details and a publication certificate that can be verified through the online journal registry.'],
    ], submit: 'Submit your manuscript', contact: 'Editorial contact',
  },
  ru: {
    title: 'ИНФОРМАЦИОННОЕ ПИСЬМО', subtitle: 'Приглашение к публикации научных статей',
    intro: 'AGM Journal приглашает исследователей, преподавателей, докторантов и студентов представить оригинальные научные работы. Новый выпуск журнала выходит каждый месяц.',
    sections: [
      ['Направления', 'Междисциплинарные исследования: естественные и точные науки, технологии, экономика, педагогика, социальные и гуманитарные науки. Соответствие тематике журнала оценивает редакция.'],
      ['Требования', 'Оригинальная, ранее не опубликованная статья: название, сведения об авторах и организациях, аннотация, ключевые слова, методы, результаты, заключение и список литературы. Укажите источники и получите согласие всех соавторов.'],
      ['Языки и файлы', 'Узбекский, английский и русский языки. PDF или DOCX объёмом до 20 МБ. Окончательный файл оформляется согласно требованиям редакции.'],
      ['Порядок публикации', 'Подача → редакционная проверка → рецензирование → исправления → решение о публикации. Подача не означает принятие. Выпуски выходят ежемесячно; номер и дата публикации определяются после решения редакции.'],
      ['Стоимость публикации', 'Для студентов: 100 000 сумов. Остальные авторы уточняют стоимость и порядок оплаты в редакции. Оплата не гарантирует принятие или положительную рецензию.'],
      ['Материалы для автора', 'Постоянная страница статьи, PDF с реквизитами журнала и сертификат публикации с проверкой подлинности в онлайн-реестре журнала.'],
    ], submit: 'Отправить статью', contact: 'Связаться с редакцией',
  },
};

export function getCallForPapers(lang: Language) { return content[lang]; }
