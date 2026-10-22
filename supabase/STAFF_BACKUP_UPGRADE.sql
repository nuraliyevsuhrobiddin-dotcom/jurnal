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
