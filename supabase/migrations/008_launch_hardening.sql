BEGIN;
CREATE INDEX IF NOT EXISTS idx_articles_catalog_page ON public.articles(status, publication_date DESC, id);
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY, recipient text NOT NULL, subject text NOT NULL, body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent')),
  attempts integer NOT NULL DEFAULT 0, last_error text, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_outbox TO service_role;
CREATE TABLE IF NOT EXISTS public.request_limits (
  key text PRIMARY KEY,
  requests integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS request_limits_expiry ON public.request_limits(expires_at);
ALTER TABLE public.request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_limits TO service_role;

-- Atomic across all app instances. Return seconds until retry, or zero.
CREATE OR REPLACE FUNCTION public.consume_request_limit(bucket_key text, max_requests integer, window_seconds integer)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE current_bucket public.request_limits; instant timestamptz := clock_timestamp();
BEGIN
  IF max_requests < 1 OR window_seconds < 1 OR window_seconds > 86400 THEN RAISE EXCEPTION 'Invalid request limit'; END IF;
  DELETE FROM public.request_limits WHERE expires_at <= instant;
  INSERT INTO public.request_limits(key, requests, expires_at)
    VALUES(bucket_key, 1, instant + make_interval(secs => window_seconds))
    ON CONFLICT(key) DO UPDATE SET requests = public.request_limits.requests + 1
    RETURNING * INTO current_bucket;
  IF current_bucket.requests > max_requests THEN
    RETURN greatest(1, ceil(extract(epoch FROM current_bucket.expires_at - instant))::integer);
  END IF;
  RETURN 0;
END; $$;

CREATE OR REPLACE FUNCTION public.increment_article_metric(article_uuid uuid, metric_name text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF metric_name = 'views_count' THEN
    UPDATE public.articles SET views_count = coalesce(views_count, 0) + 1 WHERE id = article_uuid AND status = 'published';
  ELSIF metric_name = 'downloads_count' THEN
    UPDATE public.articles SET downloads_count = coalesce(downloads_count, 0) + 1 WHERE id = article_uuid AND status = 'published';
  ELSE RAISE EXCEPTION 'Invalid metric'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.consume_request_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_article_metric(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_request_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_article_metric(uuid, text) TO service_role;

-- Pagination and filtering happen before fetching article bodies into the app.
CREATE OR REPLACE FUNCTION public.published_article_page(search_query text DEFAULT '', selected_issue uuid DEFAULT NULL,
  subject_terms text[] DEFAULT '{}', page_number integer DEFAULT 1, page_size integer DEFAULT 12)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH searchable AS (
    SELECT a.*, lower(regexp_replace(concat_ws(' ', a.title_uz, a.title_en, a.title_ru,
      a.abstract_uz, a.abstract_en, a.abstract_ru,
      array_to_string(a.keywords_uz, ' '), array_to_string(a.keywords_en, ' '), array_to_string(a.keywords_ru, ' ')),
      '[‘’ʻʼ''`]', '', 'g')) AS subject_text,
      (SELECT string_agg(au.full_name, ' ') FROM public.article_authors au WHERE au.article_id = a.id) AS author_text
    FROM public.articles a WHERE a.status = 'published' AND (selected_issue IS NULL OR a.issue_id = selected_issue)
  ), matching AS (
    SELECT * FROM searchable s
    WHERE (search_query = '' OR position(lower(regexp_replace(search_query, '[‘’ʻʼ''`]', '', 'g'))
      IN s.subject_text || ' ' || lower(regexp_replace(coalesce(s.author_text, ''), '[��??''`]', '', 'g'))) > 0)
    AND (coalesce(cardinality(subject_terms), 0) = 0 OR EXISTS (SELECT 1 FROM unnest(subject_terms) term
      WHERE position(lower(regexp_replace(term, '[‘’ʻʼ''`]', '', 'g')) IN s.subject_text) > 0))
  ), selected AS (
    SELECT * FROM matching ORDER BY publication_date DESC NULLS LAST, id
    LIMIT least(greatest(page_size, 1), 50) OFFSET (least(greatest(page_number, 1), 100000) - 1) * least(greatest(page_size, 1), 50)
  )
  SELECT jsonb_build_object('total', (SELECT count(*) FROM matching), 'items', coalesce((
    SELECT jsonb_agg((to_jsonb(s) - 'subject_text' - 'author_text' - 'submission_notes' - 'manuscript_file_url') ||
      jsonb_build_object('issue', (SELECT to_jsonb(i) FROM public.issues i WHERE i.id = s.issue_id),
        'authors', coalesce((SELECT jsonb_agg(to_jsonb(au) - 'email' ORDER BY au.order_index) FROM public.article_authors au WHERE au.article_id = s.id), '[]'::jsonb))
      ORDER BY s.publication_date DESC NULLS LAST, s.id) FROM selected s), '[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.published_article_page(text, uuid, text[], integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.published_article_page(text, uuid, text[], integer, integer) TO service_role;
-- Editorial saves must preserve concurrently incremented analytics.
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
CREATE OR REPLACE FUNCTION public.admin_article_page(search_query text DEFAULT '', selected_issue uuid DEFAULT NULL,
  selected_status text DEFAULT NULL, subject_terms text[] DEFAULT '{}', page_number integer DEFAULT 1, page_size integer DEFAULT 12)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH searchable AS (
    SELECT a.*, lower(regexp_replace(concat_ws(' ', a.title_uz, a.title_en, a.title_ru,
      a.abstract_uz, a.abstract_en, a.abstract_ru,
      array_to_string(a.keywords_uz, ' '), array_to_string(a.keywords_en, ' '), array_to_string(a.keywords_ru, ' ')),
      '[‘’ʻʼ''`]', '', 'g')) AS subject_text,
      (SELECT string_agg(au.full_name, ' ') FROM public.article_authors au WHERE au.article_id = a.id) AS author_text
    FROM public.articles a WHERE (selected_status IS NULL OR a.status = selected_status) AND (selected_issue IS NULL OR a.issue_id = selected_issue)
  ), matching AS (
    SELECT * FROM searchable s
    WHERE (search_query = '' OR position(lower(regexp_replace(search_query, '[‘’ʻʼ''`]', '', 'g'))
      IN s.subject_text || ' ' || lower(regexp_replace(coalesce(s.author_text, ''), '[��??''`]', '', 'g'))) > 0)
    AND (coalesce(cardinality(subject_terms), 0) = 0 OR EXISTS (SELECT 1 FROM unnest(subject_terms) term
      WHERE position(lower(regexp_replace(term, '[‘’ʻʼ''`]', '', 'g')) IN s.subject_text) > 0))
  ), selected AS (
    SELECT * FROM matching ORDER BY publication_date DESC NULLS LAST, id
    LIMIT least(greatest(page_size, 1), 50) OFFSET (least(greatest(page_number, 1), 100000) - 1) * least(greatest(page_size, 1), 50)
  )
  SELECT jsonb_build_object('total', (SELECT count(*) FROM matching), 'items', coalesce((
    SELECT jsonb_agg((to_jsonb(s) - 'subject_text' - 'author_text') ||
      jsonb_build_object('issue', (SELECT to_jsonb(i) FROM public.issues i WHERE i.id = s.issue_id),
        'authors', coalesce((SELECT jsonb_agg(to_jsonb(au) ORDER BY au.order_index) FROM public.article_authors au WHERE au.article_id = s.id), '[]'::jsonb))
      ORDER BY s.publication_date DESC NULLS LAST, s.id) FROM selected s), '[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.admin_article_page(text, uuid, text, text[], integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_article_page(text, uuid, text, text[], integer, integer) TO service_role;

COMMIT;
