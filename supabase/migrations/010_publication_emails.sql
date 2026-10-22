BEGIN;
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS publication jsonb;
ALTER TABLE public.notification_outbox DROP CONSTRAINT IF EXISTS notification_outbox_status_check;
ALTER TABLE public.notification_outbox ADD CONSTRAINT notification_outbox_status_check
  CHECK (status IN ('pending', 'sent', 'unknown'));
CREATE INDEX IF NOT EXISTS notification_outbox_pending ON public.notification_outbox(created_at) WHERE status = 'pending';
COMMENT ON COLUMN public.notification_outbox.publication IS 'Article and certificate references; PDFs are loaded only by the private mail worker.';
COMMIT;
