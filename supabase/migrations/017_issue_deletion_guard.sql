-- Protect linked articles even when deletion races with a new assignment.
-- RESTRICT takes effect before ON DELETE SET NULL could erase publication metadata.
BEGIN;
ALTER TABLE public.articles DROP CONSTRAINT articles_issue_id_fkey;
ALTER TABLE public.articles ADD CONSTRAINT articles_issue_id_fkey
  FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE RESTRICT;
NOTIFY pgrst, 'reload schema';
COMMIT;
