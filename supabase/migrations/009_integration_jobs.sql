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
