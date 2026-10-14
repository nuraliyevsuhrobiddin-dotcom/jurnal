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
-- Public submissions are stored by the server service role and reviewed through admin APIs.
-- No public storage read/list policy is granted for unpublished manuscripts.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('journal-manuscripts', 'journal-manuscripts', false, 20971520,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/json'])
ON CONFLICT (id) DO NOTHING;
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
    'РўРѕРј 1, Р’С‹РїСѓСЃРє 1 (РЇРЅРІР°СЂСЊ-Р¤РµРІСЂР°Р»СЊ 2026)',
    'Sun''iy intellekt, axborot texnologiyalari va raqamli iqtisodiyotning dolzarb masalalari bo''yicha ilmiy maqolalar to''plami.',
    'A collection of scientific research papers on artificial intelligence, IT, and digital economics.',
    'РЎР±РѕСЂРЅРёРє РЅР°СѓС‡РЅС‹С… СЃС‚Р°С‚РµР№ РїРѕ РёСЃРєСѓСЃСЃС‚РІРµРЅРЅРѕРјСѓ РёРЅС‚РµР»Р»РµРєС‚Сѓ, IT Рё С†РёС„СЂРѕРІРѕР№ СЌРєРѕРЅРѕРјРёРєРµ.',
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
    'РњРµС‚РѕРґС‹ РјРѕРґРµР»РёСЂРѕРІР°РЅРёСЏ Рё РїСЂРѕРіРЅРѕР·РёСЂРѕРІР°РЅРёСЏ РјР°РєСЂРѕСЌРєРѕРЅРѕРјРёС‡РµСЃРєРёС… РїСЂРѕС†РµСЃСЃРѕРІ СЃ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёРµРј РёСЃРєСѓСЃСЃС‚РІРµРЅРЅРѕРіРѕ РёРЅС‚РµР»Р»РµРєС‚Р° Рё Р°Р»РіРѕСЂРёС‚РјРѕРІ РјР°С€РёРЅРЅРѕРіРѕ РѕР±СѓС‡РµРЅРёСЏ',
    'Ushbu maqolada makroiqtisodiy ko''rsatkichlarni prognozlashda zamonaviy sun''iy intellekt va chuqur o''rganish (LSTM, Transformer) arxitekturalarining qo''llanilishi tahlil qilingan. An''anaviy ekonometrik modellar (ARIMA, VAR) bilan solishtirganda, neyron tarmoqlar o''zgaruvchan bozor sharoitlarida 18.4% yuqoriroq aniqlik ko''rsatdi. Olingan natijalar O''zbekiston Respublikasi moliya sektorida qarorlar qabul qilish samaradorligini oshirish imkonini beradi.',
    'This research investigates the application of modern artificial intelligence and deep learning architectures (LSTM, Transformer) in forecasting macroeconomic indicators. Compared to traditional econometric models (ARIMA, VAR), neural network architectures achieved an 18.4% improvement in predictive accuracy under volatile market conditions. The empirical findings provide strategic insights for enhancing decision-making efficiency in the financial sector.',
    'Р’ РґР°РЅРЅРѕР№ СЃС‚Р°С‚СЊРµ РёСЃСЃР»РµРґСѓРµС‚СЃСЏ РїСЂРёРјРµРЅРµРЅРёРµ СЃРѕРІСЂРµРјРµРЅРЅС‹С… Р°СЂС…РёС‚РµРєС‚СѓСЂ РёСЃРєСѓСЃСЃС‚РІРµРЅРЅРѕРіРѕ РёРЅС‚РµР»Р»РµРєС‚Р° Рё РіР»СѓР±РѕРєРѕРіРѕ РѕР±СѓС‡РµРЅРёСЏ (LSTM, Transformer) РІ РїСЂРѕРіРЅРѕР·РёСЂРѕРІР°РЅРёРё РјР°РєСЂРѕСЌРєРѕРЅРѕРјРёС‡РµСЃРєРёС… РїРѕРєР°Р·Р°С‚РµР»РµР№. РџРѕ СЃСЂР°РІРЅРµРЅРёСЋ СЃ С‚СЂР°РґРёС†РёРѕРЅРЅС‹РјРё СЌРєРѕРЅРѕРјРµС‚СЂРёС‡РµСЃРєРёРјРё РјРѕРґРµР»СЏРјРё (ARIMA, VAR), РЅРµР№СЂРѕСЃРµС‚РµРІС‹Рµ РјРѕРґРµР»Рё РїСЂРѕРґРµРјРѕРЅСЃС‚СЂРёСЂРѕРІР°Р»Рё РїРѕРІС‹С€РµРЅРёРµ С‚РѕС‡РЅРѕСЃС‚Рё РїСЂРѕРіРЅРѕР·Р° РЅР° 18.4% РІ СѓСЃР»РѕРІРёСЏС… РІРѕР»Р°С‚РёР»СЊРЅРѕСЃС‚Рё СЂС‹РЅРєР°.',
    ARRAY['sun''iy intellekt', 'makroiqtisodiyot', 'mashinali o''rganish', 'LSTM', 'ekonometriya', 'bashoratlash'],
    ARRAY['artificial intelligence', 'macroeconomics', 'machine learning', 'LSTM', 'econometrics', 'forecasting'],
    ARRAY['РёСЃРєСѓСЃСЃС‚РІРµРЅРЅС‹Р№ РёРЅС‚РµР»Р»РµРєС‚', 'РјР°РєСЂРѕСЌРєРѕРЅРѕРјРёРєР°', 'РјР°С€РёРЅРЅРѕРµ РѕР±СѓС‡РµРЅРёРµ', 'LSTM', 'СЌРєРѕРЅРѕРјРµС‚СЂРёРєР°', 'РїСЂРѕРіРЅРѕР·РёСЂРѕРІР°РЅРёРµ'],
    'original_research',
    'published',
    '2026-02-15',
    1, 9,
    '10.5281/zenodo.agm.2026.0101',
    'CC BY 4.0',
    ARRAY[
        'Vaswani, A., et al. (2017). Attention is all you need. Advances in Neural Information Processing Systems, 30, 5998вЂ“6008.',
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
    'РўРµС…РЅРёРєРѕ-СЌРєРѕРЅРѕРјРёС‡РµСЃРєРёРµ Р°СЃРїРµРєС‚С‹ РёРЅС‚РµРіСЂР°С†РёРё СЃРѕР»РЅРµС‡РЅРѕР№ Рё РІРµС‚СЂРѕРІРѕР№ СЌРЅРµСЂРіРёРё РІ РµРґРёРЅСѓСЋ СЌРЅРµСЂРіРѕСЃРёСЃС‚РµРјСѓ РІ СѓСЃР»РѕРІРёСЏС… Р¦РµРЅС‚СЂР°Р»СЊРЅРѕР№ РђР·РёРё',
    'Maqolada qayta tiklanuvchi energiya manbalarining O''zbekiston va Markaziy Osiyo energetika tarmog''idagi o''rni, chastota va quvvat barqarorligini ta''minlash usullari yoritilgan. Simulyatsiya natijalari akkumulyatorli energiya saqlash tizimlari (BESS) orqali elektr tarmog''idagi yuklama tebranishlarini 32% ga kamaytirish mumkinligini ko''rsatdi.',
    'The paper examines the integration of renewable energy sources into the energy grid of Uzbekistan and Central Asia, highlighting techniques for frequency regulation and power stability. Simulation experiments demonstrate that battery energy storage systems (BESS) can reduce grid load fluctuations by up to 32%.',
    'Р’ СЃС‚Р°С‚СЊРµ СЂР°СЃСЃРјР°С‚СЂРёРІР°СЋС‚СЃСЏ РІРѕРїСЂРѕСЃС‹ РёРЅС‚РµРіСЂР°С†РёРё РІРѕР·РѕР±РЅРѕРІР»СЏРµРјС‹С… РёСЃС‚РѕС‡РЅРёРєРѕРІ СЌРЅРµСЂРіРёРё РІ СЌРЅРµСЂРіРѕСЃРёСЃС‚РµРјСѓ РЈР·Р±РµРєРёСЃС‚Р°РЅР° Рё Р¦РµРЅС‚СЂР°Р»СЊРЅРѕР№ РђР·РёРё СЃ Р°РєС†РµРЅС‚РѕРј РЅР° РјРµС‚РѕРґС‹ СЂРµРіСѓР»РёСЂРѕРІР°РЅРёСЏ С‡Р°СЃС‚РѕС‚С‹ Рё СЃС‚Р°Р±РёР»СЊРЅРѕСЃС‚Рё РјРѕС‰РЅРѕСЃС‚Рё. Р РµР·СѓР»СЊС‚Р°С‚С‹ РјРѕРґРµР»РёСЂРѕРІР°РЅРёСЏ РїРѕРєР°Р·Р°Р»Рё РІРѕР·РјРѕР¶РЅРѕСЃС‚СЊ СЃРЅРёР¶РµРЅРёСЏ РєРѕР»РµР±Р°РЅРёР№ РЅР°РіСЂСѓР·РєРё РЅР° 32% СЃ РїРѕРјРѕС‰СЊСЋ СЃРёСЃС‚РµРј РЅР°РєРѕРїР»РµРЅРёСЏ СЌРЅРµСЂРіРёРё.',
    ARRAY['qayta tiklanuvchi energiya', 'quyosh panellari', 'shamol generatorlari', 'energotizim', 'BESS', 'barqarorlik'],
    ARRAY['renewable energy', 'solar PV', 'wind power', 'power grid', 'BESS', 'grid stability'],
    ARRAY['РІРѕР·РѕР±РЅРѕРІР»СЏРµРјР°СЏ СЌРЅРµСЂРіРёСЏ', 'СЃРѕР»РЅРµС‡РЅР°СЏ СЌРЅРµСЂРіРµС‚РёРєР°', 'РІРµС‚СЂРѕРіРµРЅРµСЂР°С‚РѕСЂС‹', 'СЌРЅРµСЂРіРѕСЃРёСЃС‚РµРјР°', 'Р°РєРєСѓРјСѓР»СЏС‚РѕСЂС‹'],
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
