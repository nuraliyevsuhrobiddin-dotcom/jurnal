-- Allow the admin issue editor to update existing rows through the same RPC
-- used for inserts while keeping the current issue unique.
CREATE OR REPLACE FUNCTION public.save_journal_issue(issue_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  LOCK TABLE public.issues IN SHARE ROW EXCLUSIVE MODE;

  IF (issue_data->>'is_current')::boolean THEN
    UPDATE public.issues
       SET is_current = false
     WHERE is_current = true
       AND id <> (issue_data->>'id')::uuid;
  END IF;

  INSERT INTO public.issues
  SELECT (jsonb_populate_record(NULL::public.issues, issue_data)).*
  ON CONFLICT (id) DO UPDATE SET
    volume = EXCLUDED.volume,
    issue_number = EXCLUDED.issue_number,
    year = EXCLUDED.year,
    title_uz = EXCLUDED.title_uz,
    title_en = EXCLUDED.title_en,
    title_ru = EXCLUDED.title_ru,
    description_uz = EXCLUDED.description_uz,
    description_en = EXCLUDED.description_en,
    description_ru = EXCLUDED.description_ru,
    publication_date = EXCLUDED.publication_date,
    is_current = EXCLUDED.is_current,
    cover_image_url = EXCLUDED.cover_image_url,
    full_pdf_url = EXCLUDED.full_pdf_url,
    toc_pdf_url = EXCLUDED.toc_pdf_url,
    updated_at = EXCLUDED.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.save_journal_issue(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_journal_issue(jsonb) TO service_role;
