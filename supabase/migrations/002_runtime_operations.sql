-- Atomic editorial writes. These RPCs are accessible only to the server service role.
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
    views_count = EXCLUDED.views_count, downloads_count = EXCLUDED.downloads_count,
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

CREATE OR REPLACE FUNCTION public.save_journal_issue(issue_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  LOCK TABLE public.issues IN SHARE ROW EXCLUSIVE MODE;
  IF (issue_data->>'is_current')::boolean THEN
    UPDATE public.issues SET is_current = false WHERE is_current = true;
  END IF;
  INSERT INTO public.issues SELECT (jsonb_populate_record(NULL::public.issues, issue_data)).*;
END; $$;

REVOKE ALL ON FUNCTION public.save_journal_article(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_journal_issue(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_journal_article(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_journal_issue(jsonb) TO service_role;

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  email text NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Private storage: public downloads are checked against article publication status by the server.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('journal-pdfs', 'journal-pdfs', false, 25165824, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
