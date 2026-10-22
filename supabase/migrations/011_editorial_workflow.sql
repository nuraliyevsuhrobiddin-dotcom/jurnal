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
