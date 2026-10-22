-- 001_initial_schema.sql
-- ============================================================================
-- AGM JOURNAL - COMPLETE DATABASE SCHEMA & SECURITY POLICIES
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE (Linked with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'author')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. JOURNAL SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.journal_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. ISSUES TABLE (Volumes & Issues)
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volume INTEGER NOT NULL CHECK (volume > 0),
    issue_number INTEGER NOT NULL CHECK (issue_number > 0),
    year INTEGER NOT NULL CHECK (year >= 2000),
    title_uz TEXT,
    title_en TEXT,
    title_ru TEXT,
    description_uz TEXT,
    description_en TEXT,
    description_ru TEXT,
    publication_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    cover_image_url TEXT,
    full_pdf_url TEXT,
    toc_pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_volume_issue_year UNIQUE (volume, issue_number, year)
);

-- 4. ARTICLES TABLE
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
    original_language TEXT NOT NULL DEFAULT 'uz' CHECK (original_language IN ('uz', 'en', 'ru')),

    -- Multilingual titles
    title_uz TEXT NOT NULL,
    title_en TEXT,
    title_ru TEXT,

    -- Multilingual abstracts
    abstract_uz TEXT NOT NULL,
    abstract_en TEXT,
    abstract_ru TEXT,

    -- Multilingual keywords
    keywords_uz TEXT[] NOT NULL DEFAULT '{}',
    keywords_en TEXT[] NOT NULL DEFAULT '{}',
    keywords_ru TEXT[] NOT NULL DEFAULT '{}',

    -- Article Metadata
    article_type TEXT NOT NULL DEFAULT 'original_research' CHECK (article_type IN ('original_research', 'review', 'short_communication', 'case_study')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'published', 'rejected', 'withdrawn', 'archived')),
    publication_date DATE,
    page_first INTEGER CHECK (page_first > 0),
    page_last INTEGER CHECK (page_last >= page_first),
    doi TEXT UNIQUE,
    license TEXT NOT NULL DEFAULT 'CC BY 4.0',
    references_list TEXT[] NOT NULL DEFAULT '{}',

    -- File storage paths / URLs
    manuscript_file_url TEXT,
    pdf_url TEXT,
    pdf_file_size BIGINT,

    -- Stats
    views_count INTEGER NOT NULL DEFAULT 0,
    downloads_count INTEGER NOT NULL DEFAULT 0,

    -- Submission & author notes
    submission_notes TEXT,
    retraction_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ARTICLE AUTHORS TABLE
CREATE TABLE IF NOT EXISTS public.article_authors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    affiliation TEXT NOT NULL,
    country TEXT NOT NULL,
    orcid TEXT,
    is_corresponding BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. ARTICLE FILES TABLE (Version tracking)
CREATE TABLE IF NOT EXISTS public.article_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL CHECK (file_type IN ('docx_manuscript', 'original_pdf', 'published_pdf', 'cover_sheet', 'supplementary')),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. EDITORIAL BOARD TABLE
CREATE TABLE IF NOT EXISTS public.editorial_board (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    academic_title TEXT,
    academic_degree TEXT,
    affiliation TEXT NOT NULL,
    country TEXT NOT NULL,
    email TEXT,
    orcid TEXT,
    role TEXT NOT NULL CHECK (role IN ('editor_in_chief', 'deputy_editor', 'editorial_board_member', 'scientific_secretary', 'managing_editor')),
    order_index INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. CERTIFICATES TABLE (Authors certificates with QR verification)
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_number TEXT NOT NULL UNIQUE,
    article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_affiliation TEXT,
    article_title TEXT NOT NULL,
    journal_name TEXT NOT NULL DEFAULT 'AGM Journal',
    issue_volume INTEGER NOT NULL,
    issue_number INTEGER NOT NULL,
    issue_year INTEGER NOT NULL,
    issue_date DATE NOT NULL,
    verification_code TEXT NOT NULL UNIQUE,
    qr_code_data_url TEXT,
    pdf_url TEXT,
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'revoked')),
    revoked_reason TEXT,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_issue_id ON public.articles(issue_id);
CREATE INDEX IF NOT EXISTS idx_articles_publication_date ON public.articles(publication_date DESC);
CREATE INDEX IF NOT EXISTS idx_article_authors_article_id ON public.article_authors(article_id);
CREATE INDEX IF NOT EXISTS idx_issues_year_vol_num ON public.issues(year DESC, volume DESC, issue_number DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_cert_number ON public.certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_verification_code ON public.certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_board ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Is current user an admin or editor?
CREATE OR REPLACE FUNCTION public.is_admin_or_editor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Public profiles are readable by authenticated users"
    ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update any profile"
    ON public.profiles FOR ALL TO authenticated USING (public.is_admin_or_editor());

-- Journal settings policies
CREATE POLICY "Journal settings readable by everyone"
    ON public.journal_settings FOR SELECT TO public USING (true);

CREATE POLICY "Journal settings editable only by admin"
    ON public.journal_settings FOR ALL TO authenticated USING (public.is_admin_or_editor());

-- Issues policies
CREATE POLICY "Issues readable by everyone"
    ON public.issues FOR SELECT TO public USING (true);

CREATE POLICY "Issues manageable only by admin"
    ON public.issues FOR ALL TO authenticated USING (public.is_admin_or_editor());

-- Articles policies
CREATE POLICY "Published articles are readable by everyone"
    ON public.articles FOR SELECT TO public
    USING (status = 'published');

CREATE POLICY "Admin and editors can view and manage all articles"
    ON public.articles FOR ALL TO authenticated
    USING (public.is_admin_or_editor());

-- Article authors policies
CREATE POLICY "Authors of published articles readable by everyone"
    ON public.article_authors FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.articles
            WHERE articles.id = article_authors.article_id
            AND articles.status = 'published'
        )
    );

CREATE POLICY "Admin can manage article authors"
    ON public.article_authors FOR ALL TO authenticated
    USING (public.is_admin_or_editor());

-- Editorial board policies
CREATE POLICY "Editorial board readable by everyone"
    ON public.editorial_board FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Admin can manage editorial board"
    ON public.editorial_board FOR ALL TO authenticated USING (public.is_admin_or_editor());

-- Certificates policies
CREATE POLICY "Certificates can be looked up by anyone for verification"
    ON public.certificates FOR SELECT TO public USING (true);

CREATE POLICY "Admin can manage certificates"
    ON public.certificates FOR ALL TO authenticated USING (public.is_admin_or_editor());

-- Article files policies
CREATE POLICY "Files of published articles readable by everyone"
    ON public.article_files FOR SELECT TO public
    USING (
        file_type = 'published_pdf' AND EXISTS (
            SELECT 1 FROM public.articles
            WHERE articles.id = article_files.article_id
            AND articles.status = 'published'
        )
    );

CREATE POLICY "Admin can manage all files"
    ON public.article_files FOR ALL TO authenticated USING (public.is_admin_or_editor());

-- Audit logs policies
CREATE POLICY "Audit logs readable and insertable only by admin"
    ON public.audit_logs FOR ALL TO authenticated USING (public.is_admin_or_editor());

-- 002_runtime_operations.sql
-- Atomic editorial writes. These RPCs are accessible only to the server service role.
CREATE OR REPLACE FUNCTION public.save_journal_article(article_data jsonb, author_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE item jsonb; article_uuid uuid := (article_data->>'id')::uuid;
BEGIN
  INSERT INTO public.articles SELECT (jsonb_populate_record(NULL::public.articles, article_data)).*
  ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug, issue_id = EXCLUDED.issue_id, original_language = EXCLUDED.original_language,
    title_uz = EXCLUDED.title_uz, title_en = EXCLUDED.title_en, title_ru = EXCLUDED.title_ru,
    abstract_uz = EXCLUDED.abstract_uz, abstract_en = EXCLUDED.abstract_en, abstract_ru = EXCLUDED.abstract_ru,
    keywords_uz = EXCLUDED.keywords_uz, keywords_en = EXCLUDED.keywords_en, keywords_ru = EXCLUDED.keywords_ru,
    article_type = EXCLUDED.article_type, status = EXCLUDED.status, publication_date = EXCLUDED.publication_date,
    page_first = EXCLUDED.page_first, page_last = EXCLUDED.page_last, doi = EXCLUDED.doi,
    license = EXCLUDED.license, references_list = EXCLUDED.references_list,
    manuscript_file_url = EXCLUDED.manuscript_file_url, pdf_url = EXCLUDED.pdf_url, pdf_file_size = EXCLUDED.pdf_file_size,
    views_count = EXCLUDED.views_count, downloads_count = EXCLUDED.downloads_count,
    submission_notes = EXCLUDED.submission_notes, retraction_reason = EXCLUDED.retraction_reason,
    updated_at = EXCLUDED.updated_at;
  DELETE FROM public.article_authors WHERE article_id = article_uuid;
  FOR item IN SELECT value FROM jsonb_array_elements(author_data) LOOP
    INSERT INTO public.article_authors (id, article_id, full_name, email, affiliation, country, orcid, is_corresponding, order_index)
    VALUES (gen_random_uuid(), article_uuid, item->>'full_name', NULLIF(item->>'email', ''), item->>'affiliation',
      item->>'country', NULLIF(item->>'orcid', ''), COALESCE((item->>'is_corresponding')::boolean, false),
      COALESCE((item->>'order_index')::integer, 1));
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.save_journal_issue(issue_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  LOCK TABLE public.issues IN SHARE ROW EXCLUSIVE MODE;
  IF (issue_data->>'is_current')::boolean THEN
    UPDATE public.issues SET is_current = false WHERE is_current = true;
  END IF;
  INSERT INTO public.issues SELECT (jsonb_populate_record(NULL::public.issues, issue_data)).*;
END; $$;

REVOKE ALL ON FUNCTION public.save_journal_article(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_journal_issue(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_journal_article(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_journal_issue(jsonb) TO service_role;

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  email text NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Private storage: public downloads are checked against article publication status by the server.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('journal-pdfs', 'journal-pdfs', false, 25165824, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 003_manuscript_submissions.sql
-- Private manuscript storage, accessed only through the server's admin APIs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('journal-manuscripts', 'journal-manuscripts', false, 20971520,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/json'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 004_editorial_board_management.sql
-- Keep public board lookups ordered and make administrative listing predictable.
CREATE INDEX IF NOT EXISTS idx_editorial_board_active_order
  ON public.editorial_board (is_active, order_index, full_name);

CREATE OR REPLACE FUNCTION public.set_editorial_board_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS editorial_board_updated_at ON public.editorial_board;
CREATE TRIGGER editorial_board_updated_at
  BEFORE UPDATE ON public.editorial_board
  FOR EACH ROW EXECUTE FUNCTION public.set_editorial_board_updated_at();

-- 005_issue_updates.sql
-- Allow the admin issue editor to update existing rows through the same RPC
-- used for inserts while keeping the current issue unique.
CREATE OR REPLACE FUNCTION public.save_journal_issue(issue_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  LOCK TABLE public.issues IN SHARE ROW EXCLUSIVE MODE;

  IF (issue_data->>'is_current')::boolean THEN
    UPDATE public.issues
       SET is_current = false
     WHERE is_current = true
       AND id <> (issue_data->>'id')::uuid;
  END IF;

  INSERT INTO public.issues
  SELECT (jsonb_populate_record(NULL::public.issues, issue_data)).*
  ON CONFLICT (id) DO UPDATE SET
    volume = EXCLUDED.volume,
    issue_number = EXCLUDED.issue_number,
    year = EXCLUDED.year,
    title_uz = EXCLUDED.title_uz,
    title_en = EXCLUDED.title_en,
    title_ru = EXCLUDED.title_ru,
    description_uz = EXCLUDED.description_uz,
    description_en = EXCLUDED.description_en,
    description_ru = EXCLUDED.description_ru,
    publication_date = EXCLUDED.publication_date,
    is_current = EXCLUDED.is_current,
    cover_image_url = EXCLUDED.cover_image_url,
    full_pdf_url = EXCLUDED.full_pdf_url,
    toc_pdf_url = EXCLUDED.toc_pdf_url,
    updated_at = EXCLUDED.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.save_journal_issue(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_journal_issue(jsonb) TO service_role;

-- 006_issue_cover_storage.sql
-- Publicly readable covers, uploaded only by authenticated admin API routes.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'journal-covers',
  'journal-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 007_service_role_permissions.sql
-- RLS bypass does not replace PostgreSQL table privileges.
-- Run with the postgres owner in Supabase SQL Editor for the configured project.
-- These grants apply only to the server service role; public access is unchanged.
BEGIN;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.journal_settings,
  public.issues,
  public.articles,
  public.article_authors,
  public.article_files,
  public.editorial_board,
  public.certificates,
  public.audit_logs,
  public.contact_messages
TO service_role;
GRANT EXECUTE ON FUNCTION public.save_journal_article(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_journal_issue(jsonb) TO service_role;
COMMIT;

-- seed.sql
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


-- BEGIN 008_launch_hardening
BEGIN;
CREATE INDEX IF NOT EXISTS idx_articles_catalog_page ON public.articles(status, publication_date DESC, id);
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY, recipient text NOT NULL, subject text NOT NULL, body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent')),
  attempts integer NOT NULL DEFAULT 0, last_error text, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_outbox TO service_role;
CREATE TABLE IF NOT EXISTS public.request_limits (
  key text PRIMARY KEY,
  requests integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS request_limits_expiry ON public.request_limits(expires_at);
ALTER TABLE public.request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_limits TO service_role;

-- Atomic across all app instances. Return seconds until retry, or zero.
CREATE OR REPLACE FUNCTION public.consume_request_limit(bucket_key text, max_requests integer, window_seconds integer)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE current_bucket public.request_limits; instant timestamptz := clock_timestamp();
BEGIN
  IF max_requests < 1 OR window_seconds < 1 OR window_seconds > 86400 THEN RAISE EXCEPTION 'Invalid request limit'; END IF;
  DELETE FROM public.request_limits WHERE expires_at <= instant;
  INSERT INTO public.request_limits(key, requests, expires_at)
    VALUES(bucket_key, 1, instant + make_interval(secs => window_seconds))
    ON CONFLICT(key) DO UPDATE SET requests = public.request_limits.requests + 1
    RETURNING * INTO current_bucket;
  IF current_bucket.requests > max_requests THEN
    RETURN greatest(1, ceil(extract(epoch FROM current_bucket.expires_at - instant))::integer);
  END IF;
  RETURN 0;
END; $$;

CREATE OR REPLACE FUNCTION public.increment_article_metric(article_uuid uuid, metric_name text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF metric_name = 'views_count' THEN
    UPDATE public.articles SET views_count = coalesce(views_count, 0) + 1 WHERE id = article_uuid AND status = 'published';
  ELSIF metric_name = 'downloads_count' THEN
    UPDATE public.articles SET downloads_count = coalesce(downloads_count, 0) + 1 WHERE id = article_uuid AND status = 'published';
  ELSE RAISE EXCEPTION 'Invalid metric'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.consume_request_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_article_metric(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_request_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_article_metric(uuid, text) TO service_role;

-- Pagination and filtering happen before fetching article bodies into the app.
CREATE OR REPLACE FUNCTION public.published_article_page(search_query text DEFAULT '', selected_issue uuid DEFAULT NULL,
  subject_terms text[] DEFAULT '{}', page_number integer DEFAULT 1, page_size integer DEFAULT 12)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH searchable AS (
    SELECT a.*, lower(regexp_replace(concat_ws(' ', a.title_uz, a.title_en, a.title_ru,
      a.abstract_uz, a.abstract_en, a.abstract_ru,
      array_to_string(a.keywords_uz, ' '), array_to_string(a.keywords_en, ' '), array_to_string(a.keywords_ru, ' ')),
      '[‘’ʻʼ''`]', '', 'g')) AS subject_text,
      (SELECT string_agg(au.full_name, ' ') FROM public.article_authors au WHERE au.article_id = a.id) AS author_text
    FROM public.articles a WHERE a.status = 'published' AND (selected_issue IS NULL OR a.issue_id = selected_issue)
  ), matching AS (
    SELECT * FROM searchable s
    WHERE (search_query = '' OR position(lower(regexp_replace(search_query, '[‘’ʻʼ''`]', '', 'g'))
      IN s.subject_text || ' ' || lower(regexp_replace(coalesce(s.author_text, ''), '[��??''`]', '', 'g'))) > 0)
    AND (coalesce(cardinality(subject_terms), 0) = 0 OR EXISTS (SELECT 1 FROM unnest(subject_terms) term
      WHERE position(lower(regexp_replace(term, '[‘’ʻʼ''`]', '', 'g')) IN s.subject_text) > 0))
  ), selected AS (
    SELECT * FROM matching ORDER BY publication_date DESC NULLS LAST, id
    LIMIT least(greatest(page_size, 1), 50) OFFSET (least(greatest(page_number, 1), 100000) - 1) * least(greatest(page_size, 1), 50)
  )
  SELECT jsonb_build_object('total', (SELECT count(*) FROM matching), 'items', coalesce((
    SELECT jsonb_agg((to_jsonb(s) - 'subject_text' - 'author_text' - 'submission_notes' - 'manuscript_file_url') ||
      jsonb_build_object('issue', (SELECT to_jsonb(i) FROM public.issues i WHERE i.id = s.issue_id),
        'authors', coalesce((SELECT jsonb_agg(to_jsonb(au) - 'email' ORDER BY au.order_index) FROM public.article_authors au WHERE au.article_id = s.id), '[]'::jsonb))
      ORDER BY s.publication_date DESC NULLS LAST, s.id) FROM selected s), '[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.published_article_page(text, uuid, text[], integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.published_article_page(text, uuid, text[], integer, integer) TO service_role;
-- Editorial saves must preserve concurrently incremented analytics.
CREATE OR REPLACE FUNCTION public.save_journal_article(article_data jsonb, author_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE item jsonb; article_uuid uuid := (article_data->>'id')::uuid;
BEGIN
  INSERT INTO public.articles SELECT (jsonb_populate_record(NULL::public.articles, article_data)).*
  ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug, issue_id = EXCLUDED.issue_id, original_language = EXCLUDED.original_language,
    title_uz = EXCLUDED.title_uz, title_en = EXCLUDED.title_en, title_ru = EXCLUDED.title_ru,
    abstract_uz = EXCLUDED.abstract_uz, abstract_en = EXCLUDED.abstract_en, abstract_ru = EXCLUDED.abstract_ru,
    keywords_uz = EXCLUDED.keywords_uz, keywords_en = EXCLUDED.keywords_en, keywords_ru = EXCLUDED.keywords_ru,
    article_type = EXCLUDED.article_type, status = EXCLUDED.status, publication_date = EXCLUDED.publication_date,
    page_first = EXCLUDED.page_first, page_last = EXCLUDED.page_last, doi = EXCLUDED.doi,
    license = EXCLUDED.license, references_list = EXCLUDED.references_list,
    manuscript_file_url = EXCLUDED.manuscript_file_url, pdf_url = EXCLUDED.pdf_url, pdf_file_size = EXCLUDED.pdf_file_size,
    submission_notes = EXCLUDED.submission_notes, retraction_reason = EXCLUDED.retraction_reason,
    updated_at = EXCLUDED.updated_at;
  DELETE FROM public.article_authors WHERE article_id = article_uuid;
  FOR item IN SELECT value FROM jsonb_array_elements(author_data) LOOP
    INSERT INTO public.article_authors (id, article_id, full_name, email, affiliation, country, orcid, is_corresponding, order_index)
    VALUES (gen_random_uuid(), article_uuid, item->>'full_name', NULLIF(item->>'email', ''), item->>'affiliation',
      item->>'country', NULLIF(item->>'orcid', ''), COALESCE((item->>'is_corresponding')::boolean, false),
      COALESCE((item->>'order_index')::integer, 1));
  END LOOP;
END; $$;
CREATE OR REPLACE FUNCTION public.admin_article_page(search_query text DEFAULT '', selected_issue uuid DEFAULT NULL,
  selected_status text DEFAULT NULL, subject_terms text[] DEFAULT '{}', page_number integer DEFAULT 1, page_size integer DEFAULT 12)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH searchable AS (
    SELECT a.*, lower(regexp_replace(concat_ws(' ', a.title_uz, a.title_en, a.title_ru,
      a.abstract_uz, a.abstract_en, a.abstract_ru,
      array_to_string(a.keywords_uz, ' '), array_to_string(a.keywords_en, ' '), array_to_string(a.keywords_ru, ' ')),
      '[‘’ʻʼ''`]', '', 'g')) AS subject_text,
      (SELECT string_agg(au.full_name, ' ') FROM public.article_authors au WHERE au.article_id = a.id) AS author_text
    FROM public.articles a WHERE (selected_status IS NULL OR a.status = selected_status) AND (selected_issue IS NULL OR a.issue_id = selected_issue)
  ), matching AS (
    SELECT * FROM searchable s
    WHERE (search_query = '' OR position(lower(regexp_replace(search_query, '[‘’ʻʼ''`]', '', 'g'))
      IN s.subject_text || ' ' || lower(regexp_replace(coalesce(s.author_text, ''), '[��??''`]', '', 'g'))) > 0)
    AND (coalesce(cardinality(subject_terms), 0) = 0 OR EXISTS (SELECT 1 FROM unnest(subject_terms) term
      WHERE position(lower(regexp_replace(term, '[‘’ʻʼ''`]', '', 'g')) IN s.subject_text) > 0))
  ), selected AS (
    SELECT * FROM matching ORDER BY publication_date DESC NULLS LAST, id
    LIMIT least(greatest(page_size, 1), 50) OFFSET (least(greatest(page_number, 1), 100000) - 1) * least(greatest(page_size, 1), 50)
  )
  SELECT jsonb_build_object('total', (SELECT count(*) FROM matching), 'items', coalesce((
    SELECT jsonb_agg((to_jsonb(s) - 'subject_text' - 'author_text') ||
      jsonb_build_object('issue', (SELECT to_jsonb(i) FROM public.issues i WHERE i.id = s.issue_id),
        'authors', coalesce((SELECT jsonb_agg(to_jsonb(au) ORDER BY au.order_index) FROM public.article_authors au WHERE au.article_id = s.id), '[]'::jsonb))
      ORDER BY s.publication_date DESC NULLS LAST, s.id) FROM selected s), '[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.admin_article_page(text, uuid, text, text[], integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_article_page(text, uuid, text, text[], integer, integer) TO service_role;

COMMIT;

-- END 008_launch_hardening

-- BEGIN 009_integration_jobs
BEGIN;
-- Private ledger: an uncertain external submission must not be repeated automatically.
CREATE TABLE IF NOT EXISTS public.integration_jobs (
  id text PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('crossref', 'zenodo')),
  environment text NOT NULL CHECK (environment IN ('test', 'sandbox', 'production')),
  status text NOT NULL CHECK (status IN ('pending', 'ready', 'submitted', 'failed', 'unknown')),
  remote_id text,
  remote_url text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_jobs TO service_role;
CREATE INDEX IF NOT EXISTS integration_jobs_article ON public.integration_jobs(article_id, provider);
COMMIT;

-- END 009_integration_jobs

-- BEGIN 010_publication_emails
BEGIN;
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS publication jsonb;
ALTER TABLE public.notification_outbox DROP CONSTRAINT IF EXISTS notification_outbox_status_check;
ALTER TABLE public.notification_outbox ADD CONSTRAINT notification_outbox_status_check
  CHECK (status IN ('pending', 'sent', 'unknown'));
CREATE INDEX IF NOT EXISTS notification_outbox_pending ON public.notification_outbox(created_at) WHERE status = 'pending';
COMMENT ON COLUMN public.notification_outbox.publication IS 'Article and certificate references; PDFs are loaded only by the private mail worker.';
COMMIT;
-- END 010_publication_emails

-- BEGIN 011_editorial_workflow
BEGIN;
CREATE TABLE IF NOT EXISTS public.editorial_messages (
  id uuid PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 5 AND 10000),
  kind text NOT NULL CHECK (kind IN ('note', 'revision_requested')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.editorial_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.editorial_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_messages TO service_role;
CREATE INDEX IF NOT EXISTS editorial_messages_article ON public.editorial_messages(article_id, created_at);
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'message' CHECK (kind IN ('message', 'admin_alert'));
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz;
-- Remove known invalid seed identifiers; do not replace them with invented IDs.
UPDATE public.journal_settings SET value = value || jsonb_build_object('contact_email', 'agmjoural.editorial@gmail.com')
  WHERE key = 'general';
UPDATE public.journal_settings SET value = value - 'issn_online' WHERE key = 'general' AND value->>'issn_online' = '2959-5678';
COMMIT;

-- END 011_editorial_workflow

-- BEGIN 012_notification_scheduler
-- Supabase hosted scheduler: every 5 minutes, without requiring a Vercel plan change.
-- Put agm_cron_secret and agm_site_url into Supabase Vault before enabling this job.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE OR REPLACE FUNCTION public.run_journal_notification_worker() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE site_url text; scheduler_secret text; request_id bigint;
BEGIN
  SELECT decrypted_secret INTO site_url FROM vault.decrypted_secrets WHERE name = 'agm_site_url';
  SELECT decrypted_secret INTO scheduler_secret FROM vault.decrypted_secrets WHERE name = 'agm_cron_secret';
  IF site_url IS NULL OR scheduler_secret IS NULL THEN RETURN NULL; END IF;
  IF site_url <> 'https://agmjoural.uz' THEN RAISE EXCEPTION 'Unexpected journal scheduler host'; END IF;
  SELECT net.http_get(url := site_url || '/api/cron/notifications',
    headers := jsonb_build_object('Authorization', 'Bearer ' || scheduler_secret), timeout_milliseconds := 60000) INTO request_id;
  RETURN request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.run_journal_notification_worker() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_journal_notification_worker() TO service_role;
SELECT cron.schedule('agm-notification-worker', '*/5 * * * *', 'SELECT public.run_journal_notification_worker();');

-- END 012_notification_scheduler

-- Staff, reviews and content backups (013-014)
BEGIN;
CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('owner','editor','reviewer')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.staff_security (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  legacy_login_enabled boolean NOT NULL DEFAULT true
);
INSERT INTO public.staff_security(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.review_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.staff_accounts(id),
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','submitted','cancelled')),
  recommendation text CHECK(recommendation IN ('accept','minor_revision','major_revision','reject')),
  author_comments text,
  confidential_comments text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(author_comments IS NULL OR char_length(author_comments) BETWEEN 20 AND 20000),
  CHECK(confidential_comments IS NULL OR char_length(confidential_comments) <= 20000)
);
CREATE UNIQUE INDEX IF NOT EXISTS review_active_pair ON public.review_assignments(article_id,reviewer_id) WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS review_reviewer ON public.review_assignments(reviewer_id,created_at);
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_accounts,public.staff_security,public.review_assignments FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.staff_accounts,public.staff_security,public.review_assignments TO service_role;
-- All browser data access goes through server APIs, which redact private fields.
-- A Supabase Auth session alone must never inherit old profile-editor privileges.
REVOKE ALL ON public.profiles,public.journal_settings,public.issues,public.articles,
 public.article_authors,public.article_files,public.editorial_board,public.certificates,
 public.audit_logs,public.contact_messages FROM PUBLIC,anon,authenticated;
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS public.backup_runs (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  tables integer NOT NULL,
  files integer NOT NULL,
  bytes bigint NOT NULL,
  verified boolean NOT NULL DEFAULT false
);
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.backup_runs FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.backup_runs TO service_role;
INSERT INTO storage.buckets(id,name,public,file_size_limit)
VALUES('journal-backups','journal-backups',false,67108864) ON CONFLICT(id) DO NOTHING;

-- One statement uses a single MVCC snapshot for related content tables.
-- Auth users, Vault secrets, extensions and infrastructure are deliberately excluded.
CREATE OR REPLACE FUNCTION public.journal_backup_snapshot() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
SELECT jsonb_build_object(
 'journal_settings',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.journal_settings t),
 'issues',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.issues t),
 'articles',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.articles t),
 'article_authors',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.article_authors t),
 'article_files',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.article_files t),
 'editorial_board',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.editorial_board t),
 'certificates',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.certificates t),
 'audit_logs',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.audit_logs t),
 'contact_messages',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.contact_messages t),
 'integration_jobs',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.integration_jobs t),
 'editorial_messages',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.editorial_messages t),
 'staff_accounts',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.staff_accounts t),
 'staff_security',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.staff_security t),
 'review_assignments',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.review_assignments t)
);
$$;
REVOKE ALL ON FUNCTION public.journal_backup_snapshot() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.journal_backup_snapshot() TO service_role;

-- Rehearsal restores typed rows into temporary PostgreSQL tables only.
-- LIKE copies column/check/index constraints, never live rows or foreign keys.
CREATE OR REPLACE FUNCTION public.journal_backup_restore_check(snapshot jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE table_name text; temporary_name text; restored_count bigint; counts jsonb := '{}'::jsonb;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['journal_settings','issues','articles','article_authors','article_files','editorial_board','certificates','audit_logs','contact_messages','integration_jobs','editorial_messages','staff_accounts','staff_security','review_assignments'] LOOP
  IF jsonb_typeof(snapshot->table_name) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Missing snapshot table'; END IF;
  temporary_name := 'agm_restore_' || replace(gen_random_uuid()::text,'-','');
  EXECUTE format('CREATE TEMP TABLE %I (LIKE public.%I INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP',temporary_name,table_name);
  EXECUTE format('INSERT INTO pg_temp.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I, $1)',temporary_name,table_name) USING snapshot->table_name;
  GET DIAGNOSTICS restored_count = ROW_COUNT;
  IF restored_count <> jsonb_array_length(snapshot->table_name) THEN RAISE EXCEPTION 'Restore row mismatch'; END IF;
  counts := counts || jsonb_build_object(table_name,restored_count);
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'article_authors') a WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'articles') p WHERE p->>'id'=a->>'article_id'))
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'articles') a WHERE a->>'issue_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'issues') p WHERE p->>'id'=a->>'issue_id'))
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'review_assignments') a WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'articles') p WHERE p->>'id'=a->>'article_id') OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'staff_accounts') p WHERE p->>'id'=a->>'reviewer_id'))
 THEN RAISE EXCEPTION 'Orphan snapshot reference'; END IF;
 RETURN jsonb_build_object('verified',true,'tables',counts,'target','temporary_tables');
END; $$;
REVOKE ALL ON FUNCTION public.journal_backup_restore_check(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.journal_backup_restore_check(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.run_journal_content_backup() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE site text; secret text; request_id bigint;
BEGIN
 SELECT decrypted_secret INTO site FROM vault.decrypted_secrets WHERE name='agm_site_url' LIMIT 1;
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name='agm_cron_secret' LIMIT 1;
 IF site IS NULL OR secret IS NULL OR site <> 'https://agmjoural.uz' THEN RETURN NULL; END IF;
 SELECT net.http_get(url := site || '/api/cron/backups', headers := jsonb_build_object('Authorization','Bearer '||secret), timeout_milliseconds := 60000) INTO request_id;
 RETURN request_id;
END; $$;
REVOKE ALL ON FUNCTION public.run_journal_content_backup() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.run_journal_content_backup() TO service_role;
SELECT cron.schedule('agm-daily-content-backup','15 1 * * *','SELECT public.run_journal_content_backup();');
COMMIT;
