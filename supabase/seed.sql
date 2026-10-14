-- ============================================================================
-- AGM JOURNAL - SEED DATA FOR DEMONSTRATION & TESTING
-- ============================================================================

-- Stop early with an actionable message when the schema migrations have not run.
DO $$
DECLARE
    missing_tables TEXT;
BEGIN
    SELECT string_agg(required.table_name, ', ' ORDER BY required.table_name)
      INTO missing_tables
      FROM (VALUES
        ('journal_settings'), ('issues'), ('articles'), ('article_authors'),
        ('editorial_board'), ('certificates'), ('audit_logs')
      ) AS required(table_name)
     WHERE to_regclass(format('public.%I', required.table_name)) IS NULL;

    IF missing_tables IS NOT NULL THEN
        RAISE EXCEPTION 'AGM schema is not installed. Missing tables: %. Run supabase/migrations/001_initial_schema.sql (and the remaining migrations) before supabase/seed.sql.', missing_tables;
    END IF;
END $$;

-- 1. Journal Settings
INSERT INTO public.journal_settings (key, value, description)
VALUES
(
    'general',
    '{
        "journal_name": "AGM Journal",
        "tagline": "Xalqaro Ko''p Tarmoqli Ilmiy Tadqiqotlar Jurnali | International Multidisciplinary Scientific Journal",
        "publisher": "AGM Scientific Publishing Academy",
        "issn_print": "2959-1234",
        "issn_online": "2959-5678",
        "established_year": 2026,
        "contact_email": "editorial@agmjoural.uz",
        "contact_phone": "+998 71 200 45 67",
        "address": "Toshkent shahri, Mirobod tumani, Nukus ko''chasi 45-uy",
        "doi_prefix": "10.5281/zenodo.agm"
    }'::jsonb,
    'General settings for AGM Journal'
),
(
    'indexing',
    '{
        "google_scholar": true,
        "crossref_ready": true,
        "doi_enabled": true,
        "open_access": true,
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)"
    }'::jsonb,
    'Indexing and compliance configuration'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Issue (Volume 1, Issue 1, 2026)
INSERT INTO public.issues (
    id, volume, issue_number, year,
    title_uz, title_en, title_ru,
    description_uz, description_en, description_ru,
    publication_date, is_current, cover_image_url
)
VALUES (
    'a1111111-1111-1111-1111-111111111111',
    1, 1, 2026,
    '1-Jild, 1-Son (Yanvar-Fevral 2026)',
    'Volume 1, Issue 1 (January-February 2026)',
    'Том 1, Выпуск 1 (Январь-Февраль 2026)',
    'Sun''iy intellekt, axborot texnologiyalari va raqamli iqtisodiyotning dolzarb masalalari bo''yicha ilmiy maqolalar to''plami.',
    'A collection of scientific research papers on artificial intelligence, IT, and digital economics.',
    'Сборник научных статей по искусственному интеллекту, IT и цифровой экономике.',
    '2026-02-15',
    true,
    '/images/issue-cover-default.svg'
)
ON CONFLICT (volume, issue_number, year) DO NOTHING;

-- 3. Articles
INSERT INTO public.articles (
    id, slug, issue_id, original_language,
    title_uz, title_en, title_ru,
    abstract_uz, abstract_en, abstract_ru,
    keywords_uz, keywords_en, keywords_ru,
    article_type, status, publication_date,
    page_first, page_last, doi, license,
    references_list, views_count, downloads_count
)
VALUES
(
    'b1111111-1111-1111-1111-111111111111'::uuid,
    'suniy-intellekt-yordamida-iqtisodiy-jarayonlarni-bashorat-qilish-modellari',
    'a1111111-1111-1111-1111-111111111111',
    'uz',
    'Sun''iy intellekt va mashinali o''rganish algoritmlari yordamida makroiqtisodiy jarayonlarni modellashtirish hamda prognozlash usullari',
    'Methods of Modeling and Forecasting Macroeconomic Processes Using Artificial Intelligence and Machine Learning Algorithms',
    'Методы моделирования и прогнозирования макроэкономических процессов с использованием искусственного интеллекта и алгоритмов машинного обучения',
    'Ushbu maqolada makroiqtisodiy ko''rsatkichlarni prognozlashda zamonaviy sun''iy intellekt va chuqur o''rganish (LSTM, Transformer) arxitekturalarining qo''llanilishi tahlil qilingan. An''anaviy ekonometrik modellar (ARIMA, VAR) bilan solishtirganda, neyron tarmoqlar o''zgaruvchan bozor sharoitlarida 18.4% yuqoriroq aniqlik ko''rsatdi. Olingan natijalar O''zbekiston Respublikasi moliya sektorida qarorlar qabul qilish samaradorligini oshirish imkonini beradi.',
    'This research investigates the application of modern artificial intelligence and deep learning architectures (LSTM, Transformer) in forecasting macroeconomic indicators. Compared to traditional econometric models (ARIMA, VAR), neural network architectures achieved an 18.4% improvement in predictive accuracy under volatile market conditions. The empirical findings provide strategic insights for enhancing decision-making efficiency in the financial sector.',
    'В данной статье исследуется применение современных архитектур искусственного интеллекта и глубокого обучения (LSTM, Transformer) в прогнозировании макроэкономических показателей. По сравнению с традиционными эконометрическими моделями (ARIMA, VAR), нейросетевые модели продемонстрировали повышение точности прогноза на 18.4% в условиях волатильности рынка.',
    ARRAY['sun''iy intellekt', 'makroiqtisodiyot', 'mashinali o''rganish', 'LSTM', 'ekonometriya', 'bashoratlash'],
    ARRAY['artificial intelligence', 'macroeconomics', 'machine learning', 'LSTM', 'econometrics', 'forecasting'],
    ARRAY['искусственный интеллект', 'макроэкономика', 'машинное обучение', 'LSTM', 'эконометрика', 'прогнозирование'],
    'original_research',
    'published',
    '2026-02-15',
    1, 9,
    '10.5281/zenodo.agm.2026.0101',
    'CC BY 4.0',
    ARRAY[
        'Vaswani, A., et al. (2017). Attention is all you need. Advances in Neural Information Processing Systems, 30, 5998–6008.',
        'Box, G. E., Jenkins, G. M., & Reinsel, G. C. (2015). Time series analysis: forecasting and control. John Wiley & Sons.',
        'Karimov, A. B. (2025). O''zbekistonda raqamli iqtisodiyotni rivojlantirish istiqbollari. Iqtisodiyot va Innovatsiyalar, 4(2), 45-56.'
    ],
    142, 68
),
(
    'b2222222-2222-2222-2222-222222222222',
    'qayta-tiklanuvchi-energiya-manbalarini-energiya-tizimiga-integratsiyalash',
    'a1111111-1111-1111-1111-111111111111',
    'uz',
    'Markaziy Osiyo sharoitida quyosh va shamol energiyasini yagona energetika tizimiga integratsiyalashning texnik-iqtisodiy jihatlari',
    'Techno-Economic Aspects of Integrating Solar and Wind Energy into the Unified Power Grid in Central Asian Conditions',
    'Технико-экономические аспекты интеграции солнечной и ветровой энергии в единую энергосистему в условиях Центральной Азии',
    'Maqolada qayta tiklanuvchi energiya manbalarining O''zbekiston va Markaziy Osiyo energetika tarmog''idagi o''rni, chastota va quvvat barqarorligini ta''minlash usullari yoritilgan. Simulyatsiya natijalari akkumulyatorli energiya saqlash tizimlari (BESS) orqali elektr tarmog''idagi yuklama tebranishlarini 32% ga kamaytirish mumkinligini ko''rsatdi.',
    'The paper examines the integration of renewable energy sources into the energy grid of Uzbekistan and Central Asia, highlighting techniques for frequency regulation and power stability. Simulation experiments demonstrate that battery energy storage systems (BESS) can reduce grid load fluctuations by up to 32%.',
    'В статье рассматриваются вопросы интеграции возобновляемых источников энергии в энергосистему Узбекистана и Центральной Азии с акцентом на методы регулирования частоты и стабильности мощности. Результаты моделирования показали возможность снижения колебаний нагрузки на 32% с помощью систем накопления энергии.',
    ARRAY['qayta tiklanuvchi energiya', 'quyosh panellari', 'shamol generatorlari', 'energotizim', 'BESS', 'barqarorlik'],
    ARRAY['renewable energy', 'solar PV', 'wind power', 'power grid', 'BESS', 'grid stability'],
    ARRAY['возобновляемая энергия', 'солнечная энергетика', 'ветрогенераторы', 'энергосистема', 'аккумуляторы'],
    'original_research',
    'published',
    '2026-02-15',
    10, 18,
    '10.5281/zenodo.agm.2026.0102',
    'CC BY 4.0',
    ARRAY[
        'IRENA (2024). Renewable Energy Statistics 2024. International Renewable Energy Agency, Abu Dhabi.',
        'Rahimov, S. Q. (2024). O''zbekiston energetikasida yashil vodorod va qayta tiklanuvchi energiya. Energetika Muammolari, 2, 11-23.'
    ],
    98, 41
)
ON CONFLICT (slug) DO NOTHING;

-- 4. Authors for Articles
INSERT INTO public.article_authors (
    article_id, full_name, email, affiliation, country, orcid, is_corresponding, order_index
)
SELECT seed.*
FROM (VALUES
(
    'b1111111-1111-1111-1111-111111111111'::uuid,
    'Prof. Alisher Qodirov',
    'alisher.qodirov@tuit.uz',
    'Muhammad al-Xorazmiy nomidagi Toshkent axborot texnologiyalari universiteti',
    'O''zbekiston',
    '0000-0002-1825-0097',
    true,
    1
),
(
    'b1111111-1111-1111-1111-111111111111'::uuid,
    'DSc. Nodira Rahimova',
    'n.rahimova@nuu.uz',
    'O''zbekiston Milliy universiteti',
    'O''zbekiston',
    '0000-0003-4512-8891',
    false,
    2
),
(
    'b2222222-2222-2222-2222-222222222222'::uuid,
    'Dr. Jamshid Ergashev',
    'j.ergashev@tstu.uz',
    'Islom Karimov nomidagi Toshkent davlat texnika universiteti',
    'O''zbekiston',
    '0000-0001-9043-2210',
    true,
    1
)) AS seed(article_id, full_name, email, affiliation, country, orcid, is_corresponding, order_index)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.article_authors existing
    WHERE existing.article_id = seed.article_id
      AND existing.order_index = seed.order_index
      AND existing.email IS NOT DISTINCT FROM seed.email
);

-- 5. Editorial Board
INSERT INTO public.editorial_board (
    full_name, academic_title, academic_degree, affiliation, country, email, orcid, role, order_index
)
SELECT seed.*
FROM (VALUES
(
    'Akademik Shavkat Ayupov',
    'Bosh muharrir',
    'Fizika-matematika fanlari doktori, professor, O''zR FA akademigi',
    'O''zbekiston Respublikasi Fanlar akademiyasi V.I.Romanovskiy nomidagi Matematika instituti',
    'O''zbekiston',
    'editor@agmjoural.uz',
    '0000-0002-3341-9921',
    'editor_in_chief',
    1
),
(
    'Prof. Dr. Michael Henderson',
    'Bosh muharrir o''rinbosari',
    'PhD, Computer Science & Systems Modeling',
    'Technical University of Munich (TUM)',
    'Germaniya',
    'm.henderson@tum.de',
    '0000-0001-7890-1234',
    'deputy_editor',
    2
),
(
    'Prof. Dilshod Tojiyev',
    'Tahririyat hay''ati a''zosi',
    'Texnika fanlari doktori, professor',
    'Muhammad al-Xorazmiy nomidagi Toshkent axborot texnologiyalari universiteti',
    'O''zbekiston',
    'd.tojiyev@tuit.uz',
    '0000-0002-6543-2109',
    'editorial_board_member',
    3
),
(
    'Dr. Elena Petrova',
    'Tahririyat hay''ati a''zosi',
    'DSc, Applied Mathematics & Data Analytics',
    'Lomonosov Moscow State University',
    'Rossiya',
    'elena.petrova@msu.ru',
    '0000-0003-1122-3344',
    'editorial_board_member',
    4
),
(
    'Dr. Sardor Mirzayev',
    'Mas''ul kotib',
    'PhD in Information Security',
    'AGM Journal tahririyati',
    'O''zbekiston',
    'secretary@agmjoural.uz',
    '0000-0002-9876-5432',
    'managing_editor',
    5
)) AS seed(full_name, academic_title, academic_degree, affiliation, country, email, orcid, role, order_index)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.editorial_board existing
    WHERE existing.email = seed.email
);

-- 6. Certificates
INSERT INTO public.certificates (
    certificate_number, article_id, author_name, author_affiliation,
    article_title, journal_name, issue_volume, issue_number, issue_year,
    issue_date, verification_code, status
)
VALUES
(
    'AGM-CERT-2026-000101',
    'b1111111-1111-1111-1111-111111111111',
    'Prof. Alisher Qodirov',
    'Muhammad al-Xorazmiy nomidagi Toshkent axborot texnologiyalari universiteti',
    'Sun''iy intellekt va mashinali o''rganish algoritmlari yordamida makroiqtisodiy jarayonlarni modellashtirish hamda prognozlash usullari',
    'AGM Journal',
    1, 1, 2026,
    '2026-02-15',
    'AGM-VER-7F9B1E',
    'valid'
),
(
    'AGM-CERT-2026-000102',
    'b1111111-1111-1111-1111-111111111111',
    'DSc. Nodira Rahimova',
    'O''zbekiston Milliy universiteti',
    'Sun''iy intellekt va mashinali o''rganish algoritmlari yordamida makroiqtisodiy jarayonlarni modellashtirish hamda prognozlash usullari',
    'AGM Journal',
    1, 1, 2026,
    '2026-02-15',
    'AGM-VER-3A8C5D',
    'valid'
),
(
    'AGM-CERT-2026-000103',
    'b2222222-2222-2222-2222-222222222222',
    'Dr. Jamshid Ergashev',
    'Islom Karimov nomidagi Toshkent davlat texnika universiteti',
    'Markaziy Osiyo sharoitida quyosh va shamol energiyasini yagona energetika tizimiga integratsiyalashning texnik-iqtisodiy jihatlari',
    'AGM Journal',
    1, 1, 2026,
    '2026-02-15',
    'AGM-VER-9D2E4F',
    'valid'
)
ON CONFLICT (certificate_number) DO NOTHING;

-- 7. Audit Logs initial entry
INSERT INTO public.audit_logs (action, entity_type, entity_id, details, ip_address)
SELECT seed.*
FROM (VALUES (
    'SYSTEM_INITIALIZATION',
    'system',
    '00000000-0000-0000-0000-000000000000',
    '{"message": "AGM Journal platform initialized with initial issues, seed articles, and editorial board."}'::jsonb,
    '127.0.0.1'
)) AS seed(action, entity_type, entity_id, details, ip_address)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.audit_logs existing
    WHERE existing.action = seed.action
      AND existing.entity_type = seed.entity_type
      AND existing.entity_id = seed.entity_id
      AND existing.details = seed.details
);
