BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
SET LOCAL search_path=public,extensions;

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS subject_id text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS first_published_at timestamptz;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS change_note text NOT NULL DEFAULT '';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS pdf_storage_path text;

-- The configuration is generated from src/lib/subjects.ts. Scoring mirrors the application.
CREATE OR REPLACE FUNCTION public.journal_classify_subject(a jsonb) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE config jsonb := '{"natural-sciences":["physics","chemistry","mathemat","environment","ecolog","fizika","kimyo","matematik","ekolog","физик","хими","математ","эколог"],"engineering-technology":["energy","energet","energiya","энерг","engineer","technolog","comput","artificial intelligence","software","muhandis","texnolog","sunʼiy","sun’iy","sun''iy","dastur","инженер","технолог","компьют","искусственн"],"medicine-life-sciences":["biotech","biotex","биотех","medic","health","biolog","clinical","tibb","sog‘liq","salomat","biolog","медицин","здоров","биолог","клинич"],"economics-business":["econom","business","financ","management","iqtisod","biznes","moliya","boshqaruv","эконом","бизнес","финанс","управлен"],"social-sciences":["social","societ","sociolog","law","politic","ijtimoiy","jamiyat","huquq","siyos","социаль","обществ","социолог","право","полит"],"education-humanities":["educat","pedagog","linguist","histor","cultur","literat","ta’lim","ta''lim","talim","tilshunos","tarix","madaniyat","adabiyot","образован","педагог","лингвист","истор","культур","литератур"]}'; section record; term text; score integer; best integer := 0; tied boolean := false; chosen text := 'multidisciplinary'; title text; abstract text; keywords text;
BEGIN
 title := ' ' || trim(regexp_replace(lower(normalize(concat_ws(' ',a->>'title_uz',a->>'title_en',a->>'title_ru'),NFKC)), '[^[:alnum:]]+', ' ', 'g')) || ' ';
 abstract := ' ' || trim(regexp_replace(lower(normalize(concat_ws(' ',a->>'abstract_uz',a->>'abstract_en',a->>'abstract_ru'),NFKC)), '[^[:alnum:]]+', ' ', 'g')) || ' ';
 SELECT ' ' || trim(regexp_replace(lower(normalize(coalesce(string_agg(value,' '),''),NFKC)), '[^[:alnum:]]+', ' ', 'g')) || ' ' INTO keywords FROM jsonb_array_elements_text(coalesce(a->'keywords_uz','[]') || coalesce(a->'keywords_en','[]') || coalesce(a->'keywords_ru','[]'));
 FOR section IN SELECT key,value FROM jsonb_each(config) LOOP
  score := 0;
  FOR term IN SELECT DISTINCT trim(regexp_replace(lower(value),'[^[:alnum:]]+',' ','g')) FROM jsonb_array_elements_text(section.value) LOOP
   IF position(' ' IN term)>0 OR length(term)<4 THEN
    score := score + CASE WHEN position(' '||term||' ' IN title)>0 THEN 5 ELSE 0 END + CASE WHEN position(' '||term||' ' IN keywords)>0 THEN 4 ELSE 0 END + CASE WHEN position(' '||term||' ' IN abstract)>0 THEN 1 ELSE 0 END;
   ELSE
    score := score + CASE WHEN position(' '||term IN title)>0 THEN 5 ELSE 0 END + CASE WHEN position(' '||term IN keywords)>0 THEN 4 ELSE 0 END + CASE WHEN position(' '||term IN abstract)>0 THEN 1 ELSE 0 END;
   END IF;
  END LOOP;
  IF score > best THEN best := score; chosen := section.key; tied := false;
  ELSIF score = best AND score > 0 THEN tied := true; END IF;
 END LOOP;
 RETURN CASE WHEN best=0 OR tied THEN 'multidisciplinary' ELSE chosen END;
END; $$;

UPDATE public.articles a SET subject_id = coalesce(subject_id,substring(submission_notes from '^\[AGM_SUBJECT:([a-z-]+)\]'),public.journal_classify_subject(to_jsonb(a)));
UPDATE public.articles a SET first_published_at = coalesce(publication_date::timestamptz,created_at)
WHERE first_published_at IS NULL AND (status='published' OR (status IN ('withdrawn','archived') AND publication_date IS NOT NULL) OR EXISTS(SELECT 1 FROM public.certificates c WHERE c.article_id=a.id));
UPDATE public.articles SET pdf_storage_path=id::text||'.pdf' WHERE pdf_storage_path IS NULL AND pdf_url IS NOT NULL;
ALTER TABLE public.articles ADD CONSTRAINT articles_subject_valid CHECK(subject_id IN ('natural-sciences','engineering-technology','medicine-life-sciences','economics-business','social-sciences','education-humanities','multidisciplinary'));
ALTER TABLE public.articles ADD CONSTRAINT published_article_pages_exclusive EXCLUDE USING gist
 (issue_id WITH =, int4range(page_first,page_last,'[]') WITH &&) WHERE (status='published' AND issue_id IS NOT NULL AND page_first IS NOT NULL AND page_last IS NOT NULL);
CREATE INDEX IF NOT EXISTS articles_catalog_idx ON public.articles(issue_id,subject_id,publication_date DESC,id) WHERE status='published';

CREATE TABLE public.collection_releases (
 issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
 subject_id text NOT NULL,
 released_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(issue_id,subject_id)
);
INSERT INTO public.collection_releases(issue_id,subject_id) SELECT issue_id,subject_id FROM public.articles WHERE status='published' AND issue_id IS NOT NULL GROUP BY issue_id,subject_id HAVING count(*)>=25 ON CONFLICT DO NOTHING;
ALTER TABLE public.collection_releases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.collection_releases FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.collection_releases TO service_role;

CREATE TABLE public.article_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
 revision integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), change_note text NOT NULL DEFAULT '', snapshot jsonb NOT NULL,
 pdf_storage_path text, UNIQUE(article_id,revision)
);
ALTER TABLE public.article_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.article_versions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.article_versions TO service_role;

CREATE OR REPLACE FUNCTION public.journal_article_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE issue_key text; previous jsonb;
BEGIN
 FOR issue_key IN SELECT DISTINCT id FROM unnest(ARRAY[NEW.issue_id::text,CASE WHEN TG_OP='UPDATE' THEN OLD.issue_id::text END]) id WHERE id IS NOT NULL ORDER BY id LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended('agm-issue:'||issue_key,0));
 END LOOP;
 NEW.subject_id := coalesce(NEW.subject_id,public.journal_classify_subject(to_jsonb(NEW)));
 IF TG_OP='UPDATE' THEN
  NEW.first_published_at := OLD.first_published_at;
  IF (to_jsonb(NEW)-ARRAY['views_count','downloads_count','updated_at','revision','change_note']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['views_count','downloads_count','updated_at','revision','change_note']) OR NEW.change_note IS DISTINCT FROM OLD.change_note OR current_setting('agm.authors_changed',true)='true' THEN
   previous := to_jsonb(OLD) || jsonb_build_object('authors',coalesce((SELECT jsonb_agg(to_jsonb(au) ORDER BY order_index) FROM public.article_authors au WHERE au.article_id=OLD.id),'[]'::jsonb),'issue',(SELECT to_jsonb(i) FROM public.issues i WHERE i.id=OLD.issue_id));
   INSERT INTO public.article_versions(article_id,revision,change_note,snapshot,pdf_storage_path) VALUES(OLD.id,OLD.revision,coalesce(nullif(NEW.change_note,''),'Tahririyat yangilanishi'),previous,OLD.pdf_storage_path) ON CONFLICT DO NOTHING;
   NEW.revision := OLD.revision+1;
  ELSE NEW.revision := OLD.revision; END IF;
 END IF;
 IF NEW.status='published' THEN NEW.first_published_at := coalesce(NEW.first_published_at,now()); END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER journal_article_revision BEFORE INSERT OR UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.journal_article_revision();
CREATE OR REPLACE FUNCTION public.journal_release_collection() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.status='published' AND NEW.issue_id IS NOT NULL THEN
  INSERT INTO public.collection_releases(issue_id,subject_id) SELECT NEW.issue_id,NEW.subject_id WHERE (SELECT count(*) FROM public.articles WHERE status='published' AND issue_id=NEW.issue_id AND subject_id=NEW.subject_id)>=25 ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER journal_release_collection AFTER INSERT OR UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.journal_release_collection();

CREATE OR REPLACE FUNCTION public.journal_preserve_public_record() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF OLD.first_published_at IS NOT NULL OR OLD.status='published' THEN RAISE EXCEPTION 'Nashr tarixiga ega maqolani o‘chirib bo‘lmaydi. Qaytarib olish holatidan foydalaning.' USING ERRCODE='23514'; END IF;
 RETURN OLD;
END; $$;
CREATE TRIGGER journal_preserve_public_record BEFORE DELETE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.journal_preserve_public_record();

DROP FUNCTION IF EXISTS public.save_journal_article(jsonb,jsonb);
CREATE FUNCTION public.save_journal_article(article_data jsonb,author_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE item jsonb; article_uuid uuid := (article_data->>'id')::uuid; current_revision integer; authors_changed boolean;
BEGIN
 SELECT revision INTO current_revision FROM public.articles WHERE id=article_uuid FOR UPDATE;
 IF current_revision IS NOT NULL AND (article_data->>'revision')::integer IS DISTINCT FROM current_revision THEN RAISE EXCEPTION 'Maqola boshqa muharrir tomonidan yangilangan' USING ERRCODE='40001'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_strip_nulls(to_jsonb(a)-ARRAY['id','article_id','created_at']) ORDER BY order_index),'[]') IS DISTINCT FROM coalesce((SELECT jsonb_agg(jsonb_strip_nulls((value-ARRAY['id','article_id','created_at'])||jsonb_build_object('email',nullif(value->>'email',''),'orcid',nullif(value->>'orcid',''),'is_corresponding',coalesce((value->>'is_corresponding')::boolean,false),'order_index',coalesce((value->>'order_index')::integer,1))) ORDER BY (value->>'order_index')::integer) FROM jsonb_array_elements(author_data)),'[]') INTO authors_changed FROM public.article_authors a WHERE a.article_id=article_uuid;
 PERFORM set_config('agm.authors_changed',authors_changed::text,true);
 article_data := article_data || jsonb_build_object('revision',coalesce(current_revision,1),'change_note',coalesce(article_data->>'change_note',''),'first_published_at',article_data->'first_published_at');
 IF authors_changed AND current_revision IS NOT NULL AND coalesce(article_data->>'change_note','')='' THEN article_data := article_data || jsonb_build_object('change_note','Muallif ma’lumotlari yangilandi'); END IF;
 INSERT INTO public.articles SELECT (jsonb_populate_record(NULL::public.articles,article_data)).*
 ON CONFLICT(id) DO UPDATE SET
 slug=EXCLUDED.slug,issue_id=EXCLUDED.issue_id,subject_id=EXCLUDED.subject_id,original_language=EXCLUDED.original_language,
 title_uz=EXCLUDED.title_uz,title_en=EXCLUDED.title_en,title_ru=EXCLUDED.title_ru,abstract_uz=EXCLUDED.abstract_uz,abstract_en=EXCLUDED.abstract_en,abstract_ru=EXCLUDED.abstract_ru,
 keywords_uz=EXCLUDED.keywords_uz,keywords_en=EXCLUDED.keywords_en,keywords_ru=EXCLUDED.keywords_ru,article_type=EXCLUDED.article_type,status=EXCLUDED.status,
 publication_date=EXCLUDED.publication_date,page_first=EXCLUDED.page_first,page_last=EXCLUDED.page_last,doi=EXCLUDED.doi,license=EXCLUDED.license,references_list=EXCLUDED.references_list,
 manuscript_file_url=EXCLUDED.manuscript_file_url,pdf_url=EXCLUDED.pdf_url,pdf_file_size=EXCLUDED.pdf_file_size,pdf_storage_path=EXCLUDED.pdf_storage_path,
 submission_notes=EXCLUDED.submission_notes,retraction_reason=EXCLUDED.retraction_reason,change_note=EXCLUDED.change_note,updated_at=EXCLUDED.updated_at;
 DELETE FROM public.article_authors WHERE article_id=article_uuid;
 FOR item IN SELECT value FROM jsonb_array_elements(author_data) LOOP
  INSERT INTO public.article_authors(id,article_id,full_name,email,affiliation,country,orcid,is_corresponding,order_index)
  VALUES(gen_random_uuid(),article_uuid,item->>'full_name',nullif(item->>'email',''),item->>'affiliation',item->>'country',nullif(item->>'orcid',''),coalesce((item->>'is_corresponding')::boolean,false),coalesce((item->>'order_index')::integer,1));
 END LOOP;
 RETURN (SELECT to_jsonb(a)||jsonb_build_object('authors',coalesce((SELECT jsonb_agg(to_jsonb(au) ORDER BY order_index) FROM public.article_authors au WHERE au.article_id=a.id),'[]'::jsonb),'issue',(SELECT to_jsonb(i) FROM public.issues i WHERE i.id=a.issue_id)) FROM public.articles a WHERE a.id=article_uuid);
END; $$;
REVOKE ALL ON FUNCTION public.save_journal_article(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_journal_article(jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.catalog_article_page(search_query text DEFAULT '',selected_issue uuid DEFAULT NULL,selected_subject text DEFAULT NULL,page_number integer DEFAULT 1,page_size integer DEFAULT 12)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
WITH matching AS (
 SELECT a.* FROM public.articles a JOIN public.collection_releases r ON r.issue_id=a.issue_id AND r.subject_id=a.subject_id
 WHERE a.status='published' AND (selected_issue IS NULL OR a.issue_id=selected_issue) AND (selected_subject IS NULL OR a.subject_id=selected_subject)
 AND (search_query='' OR position(lower(regexp_replace(search_query,'[‘’ʻʼ''`]','','g')) IN lower(regexp_replace(concat_ws(' ',a.title_uz,a.title_en,a.title_ru,a.abstract_uz,a.abstract_en,a.abstract_ru,array_to_string(a.keywords_uz,' '),array_to_string(a.keywords_en,' '),array_to_string(a.keywords_ru,' '),(SELECT string_agg(full_name,' ') FROM public.article_authors au WHERE au.article_id=a.id)),'[‘’ʻʼ''`]','','g')))>0)
), selected AS (SELECT * FROM matching ORDER BY publication_date DESC NULLS LAST,id LIMIT least(greatest(page_size,1),50) OFFSET (least(greatest(page_number,1),100000)-1)*least(greatest(page_size,1),50))
SELECT jsonb_build_object('total',(SELECT count(*) FROM matching),'items',coalesce((SELECT jsonb_agg(to_jsonb(s)||jsonb_build_object('authors',coalesce((SELECT jsonb_agg(to_jsonb(au) ORDER BY order_index) FROM public.article_authors au WHERE au.article_id=s.id),'[]'::jsonb),'issue',(SELECT to_jsonb(i) FROM public.issues i WHERE i.id=s.issue_id)) ORDER BY s.publication_date DESC NULLS LAST,s.id) FROM selected s),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.catalog_article_page(text,uuid,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_article_page(text,uuid,text,integer,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.journal_collection_summary(selected_issue uuid DEFAULT NULL)
RETURNS TABLE(issue_id uuid,subject_id text,published_count bigint,released_at timestamptz) LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT i.id,s.subject_id,count(a.id),r.released_at FROM public.issues i
 CROSS JOIN unnest(ARRAY['natural-sciences','engineering-technology','medicine-life-sciences','economics-business','social-sciences','education-humanities','multidisciplinary']) s(subject_id)
 LEFT JOIN public.articles a ON a.issue_id=i.id AND a.subject_id=s.subject_id AND a.status='published'
 LEFT JOIN public.collection_releases r ON r.issue_id=i.id AND r.subject_id=s.subject_id
 WHERE selected_issue IS NULL OR i.id=selected_issue GROUP BY i.id,s.subject_id,r.released_at;
$$;
REVOKE ALL ON FUNCTION public.journal_collection_summary(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.journal_collection_summary(uuid) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
