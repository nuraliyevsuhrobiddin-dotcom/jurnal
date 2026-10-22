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
