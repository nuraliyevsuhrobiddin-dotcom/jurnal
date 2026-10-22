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
