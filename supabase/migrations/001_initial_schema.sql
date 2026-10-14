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
