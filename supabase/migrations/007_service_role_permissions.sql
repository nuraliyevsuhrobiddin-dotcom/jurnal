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
