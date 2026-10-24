import { isServerSupabaseConfigured } from './supabase/server';
import { Article, Issue, EditorialBoardMember, Certificate, JournalSettings, AuditLog } from '@/types/journal';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Test fixtures used exclusively during automated tests (vitest)
const TEST_ISSUES: Issue[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    volume: 1,
    issue_number: 1,
    year: 2026,
    title_uz: '1-Jild, 1-Son (Yanvar-Fevral 2026)',
    title_en: 'Volume 1, Issue 1 (January-February 2026)',
    title_ru: 'Том 1, Выпуск 1 (Январь-Февраль 2026)',
    description_uz: 'Sun‘iy intellekt, axborot texnologiyalari va raqamli iqtisodiyotning dolzarb masalalari bo‘yicha ilmiy maqolalar to‘plami.',
    description_en: 'A collection of scientific research papers on artificial intelligence, IT, and digital economics.',
    description_ru: 'Сборник научных статей по искусственному интеллекту, IT и цифровой экономике.',
    publication_date: '2026-02-15',
    is_current: true,
    cover_image_url: '/images/issue-cover-default.svg',
    articles_count: 2,
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-02-15T10:00:00Z',
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    volume: 1,
    issue_number: 2,
    year: 2026,
    title_uz: '1-Jild, 2-Son (Mart-Aprel 2026)',
    title_en: 'Volume 1, Issue 2 (March-April 2026)',
    title_ru: 'Том 1, Выпуск 2 (Март-Апрель 2026)',
    description_uz: 'Biotexnologiyalar, tibbiyot va farmatsevtika sohasidagi ilmiy izlanishlar.',
    description_en: 'Scientific research in biotechnology, medicine, and pharmacology.',
    description_ru: 'Научные исследования в области биотехнологий, медицины и фармакологии.',
    publication_date: '2026-04-10',
    is_current: false,
    cover_image_url: '/images/issue-cover-default.svg',
    articles_count: 1,
    created_at: '2026-04-10T10:00:00Z',
    updated_at: '2026-04-10T10:00:00Z',
  }
];

const TEST_ARTICLES: Article[] = [
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    slug: 'suniy-intellekt-yordamida-iqtisodiy-jarayonlarni-bashorat-qilish-modellari',
    issue_id: 'a1111111-1111-1111-1111-111111111111',
    original_language: 'uz',
    title_uz: 'Sun‘iy intellekt va mashinali o‘rganish algoritmlari yordamida makroiqtisodiy jarayonlarni modellashtirish hamda prognozlash usullari',
    title_en: 'Methods of Modeling and Forecasting Macroeconomic Processes Using Artificial Intelligence and Machine Learning Algorithms',
    title_ru: 'Методы моделирования и прогнозирования макроэкономических процессов с использованием искусственного интеллекта и алгоритмов машинного обучения',
    abstract_uz: 'Ushbu maqolada makroiqtisodiy ko‘rsatkichlarni prognozlashda zamonaviy sun‘iy intellekt va chuqur o‘rganish (LSTM, Transformer) arxitekturalarining qo‘llanilishi tahlil qilingan. An‘anaviy ekonometrik modellar (ARIMA, VAR) bilan solishtirganda, neyron tarmoqlar o‘zgaruvchan bozor sharoitlarida 18.4% yuqoriroq aniqlik ko‘rsatdi. Olingan natijalar O‘zbekiston Respublikasi moliya sektorida qarorlar qabul qilish samaradorligini oshirish imkonini beradi.',
    abstract_en: 'This research investigates the application of modern artificial intelligence and deep learning architectures (LSTM, Transformer) in forecasting macroeconomic indicators. Compared to traditional econometric models (ARIMA, VAR), neural network architectures achieved an 18.4% improvement in predictive accuracy under volatile market conditions. The empirical findings provide strategic insights for enhancing decision-making efficiency in the financial sector.',
    abstract_ru: 'В данной статье исследуется применение современных архитектур искусственного интеллекта и глубокого обучения (LSTM, Transformer) в прогнозировании макроэкономических показателей. По сравнению с традиционными эконометрическими моделями (ARIMA, VAR), нейросетевые модели продемонстрировали повышение точности прогноза на 18.4% в условиях волатильности рынка.',
    keywords_uz: ['sun‘iy intellekt', 'makroiqtisodiyot', 'mashinali o‘rganish', 'LSTM', 'ekonometriya', 'bashoratlash'],
    keywords_en: ['artificial intelligence', 'macroeconomics', 'machine learning', 'LSTM', 'econometrics', 'forecasting'],
    keywords_ru: ['искусственный интеллект', 'макроэкономика', 'машинное обучение', 'LSTM', 'эконометрика', 'прогнозирование'],
    article_type: 'original_research',
    status: 'published',
    publication_date: '2026-02-15',
    page_first: 1,
    page_last: 9,
    doi: '10.5281/zenodo.agm.2026.0101',
    license: 'CC BY 4.0',
    references_list: [
      'Vaswani, A., et al. (2017). Attention is all you need. Advances in Neural Information Processing Systems, 30, 5998–6008.',
      'Box, G. E., Jenkins, G. M., & Reinsel, G. C. (2015). Time series analysis: forecasting and control. John Wiley & Sons.',
      'Karimov, A. B. (2025). O‘zbekistonda raqamli iqtisodiyotni rivojlantirish istiqbollari. Iqtisodiyot va Innovatsiyalar, 4(2), 45-56.'
    ],
    views_count: 184,
    downloads_count: 73,
    created_at: '2026-02-10T09:00:00Z',
    updated_at: '2026-02-15T12:00:00Z',
    authors: [
      {
        id: 'auth-1',
        article_id: 'b1111111-1111-1111-1111-111111111111',
        full_name: 'Prof. Alisher Qodirov',
        email: 'alisher.qodirov@tuit.uz',
        affiliation: 'Muhammad al-Xorazmiy nomidagi Toshkent axborot texnologiyalari universiteti',
        country: 'O‘zbekiston',
        orcid: '0000-0002-1825-0097',
        is_corresponding: true,
        order_index: 1,
      },
      {
        id: 'auth-2',
        article_id: 'b1111111-1111-1111-1111-111111111111',
        full_name: 'DSc. Nodira Rahimova',
        email: 'n.rahimova@nuu.uz',
        affiliation: 'O‘zbekiston Milliy universiteti',
        country: 'O‘zbekiston',
        orcid: '0000-0003-4512-8891',
        is_corresponding: false,
        order_index: 2,
      }
    ]
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    slug: 'qayta-tiklanuvchi-energiya-manbalarini-energiya-tizimiga-integratsiyalash',
    issue_id: 'a1111111-1111-1111-1111-111111111111',
    original_language: 'uz',
    title_uz: 'Markaziy Osiyo sharoitida quyosh va shamol energiyasini yagona energetika tizimiga integratsiyalashning texnik-iqtisodiy jihatlari',
    title_en: 'Techno-Economic Aspects of Integrating Solar and Wind Energy into the Unified Power Grid in Central Asian Conditions',
    title_ru: 'Технико-экономические аспекты интеграции солнечной и ветровой энергии в единую энергосистему в условиях Центральной Азии',
    abstract_uz: 'Maqolada qayta tiklanuvchi energiya manbalarining O‘zbekiston va Markaziy Osiyo energetika tarmog‘idagi o‘rni, chastota va quvvat barqarorligini ta‘minlash usullari yoritilgan. Simulyatsiya natijalari akkumulyatorli energiya saqlash tizimlari (BESS) orqali elektr tarmog‘idagi yuklama tebranishlarini 32% ga kamaytirish mumkinligini ko‘rsatdi.',
    abstract_en: 'The paper examines the integration of renewable energy sources into the energy grid of Uzbekistan and Central Asia, highlighting techniques for frequency regulation and power stability. Simulation experiments demonstrate that battery energy storage systems (BESS) can reduce grid load fluctuations by up to 32%.',
    abstract_ru: 'В статье рассматриваются вопросы интеграции возобновляемых источников энергии в энергосистему Узбекистана и Центральной Азии с акцентом на методы регулирования частоты и стабильности мощности. Результаты моделирования показали возможность снижения колебаний нагрузки на 32% с помощью систем накопления энергии.',
    keywords_uz: ['qayta tiklanuvchi energiya', 'quyosh panellari', 'shamol generatorlari', 'energotizim', 'BESS', 'barqarorlik'],
    keywords_en: ['renewable energy', 'solar PV', 'wind power', 'power grid', 'BESS', 'grid stability'],
    keywords_ru: ['возобновляемая энергия', 'солнечная энергетика', 'ветрогенераторы', 'энергосистема', 'аккумуляторы'],
    article_type: 'original_research',
    status: 'published',
    publication_date: '2026-02-15',
    page_first: 10,
    page_last: 18,
    doi: '10.5281/zenodo.agm.2026.0102',
    license: 'CC BY 4.0',
    references_list: [
      'IRENA (2024). Renewable Energy Statistics 2024. International Renewable Energy Agency, Abu Dhabi.',
      'Rahimov, S. Q. (2024). O‘zbekiston energetikasida yashil vodorod va qayta tiklanuvchi energiya. Energetika Muammolari, 2, 11-23.'
    ],
    views_count: 112,
    downloads_count: 48,
    created_at: '2026-02-12T11:00:00Z',
    updated_at: '2026-02-15T12:00:00Z',
    authors: [
      {
        id: 'auth-3',
        article_id: 'b2222222-2222-2222-2222-222222222222',
        full_name: 'Dr. Jamshid Ergashev',
        email: 'j.ergashev@tstu.uz',
        affiliation: 'Islom Karimov nomidagi Toshkent davlat texnika universiteti',
        country: 'O‘zbekiston',
        orcid: '0000-0001-9043-2210',
        is_corresponding: true,
        order_index: 1,
      }
    ]
  },
  {
    id: 'b3333333-3333-3333-3333-333333333333',
    slug: 'genetika-va-biotexnologiyada-crispr-cas9-texnologiyasi-istiqbollari',
    issue_id: 'a2222222-2222-2222-2222-222222222222',
    original_language: 'en',
    title_uz: 'Zamonaviy genetik injiniringda CRISPR-Cas9 genom tahrirlash tizimining agrosanoatdagi amaliy qo‘llanilishi',
    title_en: 'Practical Applications and Precision Analysis of CRISPR-Cas9 Genome Editing in Agricultural Biotechnology',
    title_ru: 'Практическое применение и анализ точности редактирования генома CRISPR-Cas9 в сельскохозяйственной биотехнологии',
    abstract_uz: 'Qishloq xo‘jaligi ekinlarining qurg‘oqchilik va sho‘rlanishga chidamliligini oshirishda CRISPR-Cas9 tizimi yordamida maqsadli genom mutatsiyalari yaratish tajribalari tahlil qilingan.',
    abstract_en: 'This paper evaluates the precision and efficacy of targeted CRISPR-Cas9 genome editing in developing drought and salinity-tolerant agricultural crops.',
    abstract_ru: 'В статье оценивается точность и эффективность целевого редактирования генома CRISPR-Cas9 при создании засухо- и солеустойчивых сельскохозяйственных культур.',
    keywords_uz: ['CRISPR-Cas9', 'biotexnologiya', 'genomika', 'qurg‘oqchilikka chidamlilik', 'seleksiya'],
    keywords_en: ['CRISPR-Cas9', 'biotechnology', 'genomics', 'drought tolerance', 'crop breeding'],
    keywords_ru: ['CRISPR-Cas9', 'биотехнология', 'геномика', 'засухоустойчивость', 'селекция'],
    article_type: 'review',
    status: 'published',
    publication_date: '2026-04-10',
    page_first: 1,
    page_last: 12,
    doi: '10.5281/zenodo.agm.2026.0201',
    license: 'CC BY 4.0',
    references_list: [
      'Doudna, J. A., & Charpentier, E. (2014). The new frontier of genome engineering with CRISPR-Cas9. Science, 346(6213), 1258096.'
    ],
    views_count: 85,
    downloads_count: 34,
    created_at: '2026-04-05T08:00:00Z',
    updated_at: '2026-04-10T11:00:00Z',
    authors: [
      {
        id: 'auth-4',
        article_id: 'b3333333-3333-3333-3333-333333333333',
        full_name: 'DSc. Malika Usmonova',
        email: 'm.usmonova@biotech.uz',
        affiliation: 'O‘zR FA Genomika va bioinformatika markazi',
        country: 'O‘zbekiston',
        orcid: '0000-0002-5566-7788',
        is_corresponding: true,
        order_index: 1,
      }
    ]
  },
  {
    id: 'b4444444-4444-4444-4444-444444444444',
    slug: 'kriptografiya-va-post-kvant-xavfsizlik-protokollari',
    original_language: 'en',
    title_uz: 'Post-kvant davrida ma‘lumotlar xavfsizligini ta‘minlash uchun panjaraga asoslangan kriptografik algoritmlar tahlili',
    title_en: 'Analysis of Lattice-Based Cryptographic Algorithms for Ensuring Data Security in the Post-Quantum Era',
    title_ru: 'Анализ решеточных криптографических алгоритмов для обеспечения безопасности данных в постквантовую эпоху',
    abstract_uz: 'Kvant kompyuterlari rivojlanishi sharoitida klassik RSA va ECC algoritmlari zaiflashuvi munosabati bilan NIST tomonidan standartlashtirilgan Kyber va Dilithium algoritmlarining samaradorligi baholandi.',
    abstract_en: 'As quantum computing capabilities threaten classical RSA and ECC cryptographic schemes, this study analyzes the computational performance and resistance of NIST-standardized lattice-based protocols.',
    abstract_ru: 'В исследовании оценивается производительность и стойкость решеточных алгоритмов Kyber и Dilithium в условиях уязвимости классических алгоритмов RSA и ECC.',
    keywords_uz: ['kriptografiya', 'post-kvant', 'Lattice-based', 'Kyber', 'axborot xavfsizligi'],
    keywords_en: ['cryptography', 'post-quantum', 'lattice-based', 'Kyber', 'information security'],
    keywords_ru: ['криптография', 'постквантовая', 'Kyber', 'информационная безопасность'],
    article_type: 'original_research',
    status: 'under_review',
    license: 'CC BY 4.0',
    references_list: [
      'NIST (2024). Post-Quantum Cryptography Standardization. National Institute of Standards and Technology.'
    ],
    views_count: 12,
    downloads_count: 2,
    created_at: '2026-04-12T14:00:00Z',
    updated_at: '2026-04-12T14:00:00Z',
    authors: [
      {
        id: 'auth-5',
        article_id: 'b4444444-4444-4444-4444-444444444444',
        full_name: 'Farhod Sobirov',
        email: 'f.sobirov@sec.uz',
        affiliation: 'Toshkent axborot texnologiyalari universiteti',
        country: 'O‘zbekiston',
        orcid: '0000-0003-8899-0011',
        is_corresponding: true,
        order_index: 1,
      }
    ]
  }
];

const TEST_CERTIFICATES: Certificate[] = [
  {
    id: 'cert-1',
    certificate_number: 'AGM-CERT-2026-000101',
    article_id: 'b1111111-1111-1111-1111-111111111111',
    author_name: 'Prof. Alisher Qodirov',
    author_affiliation: 'Muhammad al-Xorazmiy nomidagi Toshkent axborot texnologiyalari universiteti',
    article_title: 'Sun‘iy intellekt va mashinali o‘rganish algoritmlari yordamida makroiqtisodiy jarayonlarni modellashtirish hamda prognozlash usullari',
    journal_name: 'AGM Journal',
    issue_volume: 1,
    issue_number: 1,
    issue_year: 2026,
    issue_date: '2026-02-15',
    verification_code: 'AGM-VER-7F9B1E',
    status: 'valid',
    created_at: '2026-02-15T12:30:00Z',
  },
  {
    id: 'cert-2',
    certificate_number: 'AGM-CERT-2026-000102',
    article_id: 'b1111111-1111-1111-1111-111111111111',
    author_name: 'DSc. Nodira Rahimova',
    author_affiliation: 'O‘zbekiston Milliy universiteti',
    article_title: 'Sun‘iy intellekt va mashinali o‘rganish algoritmlari yordamida makroiqtisodiy jarayonlarni modellashtirish hamda prognozlash usullari',
    journal_name: 'AGM Journal',
    issue_volume: 1,
    issue_number: 1,
    issue_year: 2026,
    issue_date: '2026-02-15',
    verification_code: 'AGM-VER-3A8C5D',
    status: 'valid',
    created_at: '2026-02-15T12:30:00Z',
  },
  {
    id: 'cert-3',
    certificate_number: 'AGM-CERT-2026-000103',
    article_id: 'b2222222-2222-2222-2222-222222222222',
    author_name: 'Dr. Jamshid Ergashev',
    author_affiliation: 'Islom Karimov nomidagi Toshkent davlat texnika universiteti',
    article_title: 'Markaziy Osiyo sharoitida quyosh va shamol energiyasini yagona energetika tizimiga integratsiyalashning texnik-iqtisodiy jihatlari',
    journal_name: 'AGM Journal',
    issue_volume: 1,
    issue_number: 1,
    issue_year: 2026,
    issue_date: '2026-02-15',
    verification_code: 'AGM-VER-9D2E4F',
    status: 'valid',
    created_at: '2026-02-15T12:35:00Z',
  }
];

// Local single-server storage; Supabase is used for hosted/multi-instance deployments.
export class JournalStore {
  private static instance: JournalStore;
  private filePath = path.join(process.env.JOURNAL_DATA_DIR || path.join(process.cwd(), '.data'), 'journal.json');
  contactMessages: { id: string; name: string; email: string; message: string; created_at: string }[] = [];

  // Reload before operations: Next may bundle pages and API handlers separately.
  refresh(): void {
    if (process.env.VITEST || isServerSupabaseConfigured || !existsSync(this.filePath)) return;
    try {
      const saved = JSON.parse(readFileSync(this.filePath, 'utf8'));
      for (const key of ['settings', 'issues', 'articles', 'editorialBoard', 'certificates', 'auditLogs', 'contactMessages'] as const) {
        if (saved[key] !== undefined) Object.assign(this, { [key]: saved[key] });
      }
    } catch {
      // In case of read/parse error, keep current state
    }
  }

  persist(): void {
    if (process.env.VITEST || isServerSupabaseConfigured) return;
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify({
      settings: this.settings, issues: this.issues, articles: this.articles,
      editorialBoard: this.editorialBoard, certificates: this.certificates,
      auditLogs: this.auditLogs, contactMessages: this.contactMessages,
    }, null, 2), 'utf8');
    renameSync(temporaryPath, this.filePath);
  }

  settings: JournalSettings = {
    journal_name: 'AGM Journal',
    tagline: 'Xalqaro ko‘p tarmoqli ilmiy-tadqiqotlar jurnali | International Multidisciplinary Scientific Journal',
    publisher: 'AGM Scientific Publishing Academy',
    issn_print: '',
    issn_online: '',
    established_year: 2026,
    contact_email: 'agmjoural.editorial@gmail.com',
    contact_phone: '+998 99 777 70 31',
    address: 'O‘zbekiston, Qashqadaryo viloyati, Shahrisabz shahri, Shahrisabz ko‘chasi, 10-uy, 181302 (yozishmalar uchun)',
    doi_prefix: '',
  };

  issues: Issue[] = process.env.VITEST ? [...TEST_ISSUES] : [];
  articles: Article[] = process.env.VITEST ? [...TEST_ARTICLES] : [];
  certificates: Certificate[] = process.env.VITEST ? [...TEST_CERTIFICATES] : [];
  auditLogs: AuditLog[] = [];

  editorialBoard: EditorialBoardMember[] = [
    {
      id: 'ed-1',
      full_name: 'Akademik Shavkat Ayupov',
      academic_title: 'Bosh muharrir',
      academic_degree: 'Fizika-matematika fanlari doktori, professor, O‘zR FA akademigi',
      affiliation: 'O‘zR Fanlar akademiyasi V.I.Romanovskiy nomidagi Matematika instituti',
      country: 'O‘zbekiston',
      email: 'editor@agmjoural.uz',
      orcid: '0000-0002-3341-9921',
      role: 'editor_in_chief',
      order_index: 1,
      is_active: true,
    },
    {
      id: 'ed-2',
      full_name: 'Prof. Dr. Michael Henderson',
      academic_title: 'Bosh muharrir o‘rinbosari',
      academic_degree: 'PhD, Computer Science & Systems Modeling',
      affiliation: 'Technical University of Munich (TUM)',
      country: 'Germaniya',
      email: 'm.henderson@tum.de',
      orcid: '0000-0001-7890-1234',
      role: 'deputy_editor',
      order_index: 2,
      is_active: true,
    },
    {
      id: 'ed-3',
      full_name: 'Prof. Dilshod Tojiyev',
      academic_title: 'Tahririyat hay‘ati a‘zosi',
      academic_degree: 'Texnika fanlari doktori, professor',
      affiliation: 'Muhammad al-Xorazmiy nomidagi TATU',
      country: 'O‘zbekiston',
      email: 'd.tojiyev@tuit.uz',
      orcid: '0000-0002-6543-2109',
      role: 'editorial_board_member',
      order_index: 3,
      is_active: true,
    },
    {
      id: 'ed-4',
      full_name: 'Dr. Elena Petrova',
      academic_title: 'Tahririyat hay‘ati a‘zosi',
      academic_degree: 'DSc, Applied Mathematics & Data Analytics',
      affiliation: 'Lomonosov Moscow State University',
      country: 'Rossiya',
      email: 'elena.petrova@msu.ru',
      orcid: '0000-0003-1122-3344',
      role: 'editorial_board_member',
      order_index: 4,
      is_active: true,
    },
    {
      id: 'ed-5',
      full_name: 'Dr. Sardor Mirzayev',
      academic_title: 'Mas‘ul kotib',
      academic_degree: 'PhD in Information Security',
      affiliation: 'AGM Journal tahririyati',
      country: 'O‘zbekiston',
      email: 'secretary@agmjoural.uz',
      orcid: '0000-0002-9876-5432',
      role: 'managing_editor',
      order_index: 5,
      is_active: true,
    }
  ];

  public static getInstance(): JournalStore {
    if (!JournalStore.instance) {
      JournalStore.instance = new JournalStore();
      JournalStore.instance.refresh();
    }
    return JournalStore.instance;
  }
}

export const journalStore = JournalStore.getInstance();
