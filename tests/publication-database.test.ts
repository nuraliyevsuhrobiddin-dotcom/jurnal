import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFile } from 'node:fs/promises';
import { subjectCollections, resolveSubjectId } from '@/lib/subjects';
import { journalStore } from '@/lib/data-store';

describe('Publication database constraints and transactions', () => {
  const db = new PGlite({ extensions: { btree_gist, pgcrypto } });
  const issue='11111111-1111-4111-8111-111111111111';
  beforeAll(async () => {
    await db.exec('CREATE SCHEMA auth; CREATE SCHEMA extensions; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
    const schema=(await readFile('supabase/migrations/001_initial_schema.sql','utf8')).split('-- ROW LEVEL SECURITY')[0];
    await db.exec(schema);
    await db.exec(await readFile('supabase/migrations/015_publication_integrity.sql','utf8'));
    await db.query("INSERT INTO issues(id,volume,issue_number,year,publication_date) VALUES($1,1,1,2026,'2026-10-30')",[issue]);
  },30000);
  afterAll(async () => { await db.close(); });

  it('uses the same subject classification for migration backfill and application writes', async () => {
    for (const subject of subjectCollections) {
      const article={...journalStore.articles[0],subject_id:undefined,title_uz:subject.terms[0] || 'Overview',title_en:undefined,title_ru:undefined,abstract_uz:'',abstract_en:undefined,abstract_ru:undefined,keywords_uz:[],keywords_en:[],keywords_ru:[]};
      const result=await db.query<{id:string}>('SELECT journal_classify_subject($1) id',[JSON.stringify(article)]);
      expect(result.rows[0].id).toBe(resolveSubjectId(article));
    }
  });

  it('releases at 25, paginates before returning rows and preserves release after withdrawal',async () => {
    for(let n=1;n<=25;n++) await db.query("INSERT INTO articles(slug,issue_id,title_uz,abstract_uz,status,subject_id,page_first,page_last) VALUES($1,$2,'Research','Research abstract','published','natural-sciences',$3,$3)",['paper-'+n,issue,n]);
    let result=await db.query<{result:{total:number;items:unknown[]}}>("SELECT catalog_article_page('',NULL,NULL,1,12) result");
    expect(result.rows[0].result.total).toBe(25); expect(result.rows[0].result.items).toHaveLength(12);
    await db.exec("UPDATE articles SET status='withdrawn',retraction_reason='Correction' WHERE slug='paper-1'");
    result=await db.query("SELECT catalog_article_page('',NULL,NULL,1,12) result");
    expect(result.rows[0].result.total).toBe(24);
    expect((await db.query<{count:number}>('SELECT count(*)::integer count FROM article_versions')).rows[0].count).toBe(1);
  });

  it('rejects overlapping published ranges at the database boundary',async () => {
    await expect(db.query("INSERT INTO articles(slug,issue_id,title_uz,abstract_uz,status,page_first,page_last) VALUES('overlap',$1,'Physics','Research','published',2,2)",[issue])).rejects.toMatchObject({code:'23P01'});
  });

  it('archives immutable metadata and rejects a stale editor save',async () => {
    const row=(await db.query<Record<string,unknown>>("SELECT * FROM articles WHERE slug='paper-2'")).rows[0];
    await db.query('SELECT save_journal_article($1,$2)',[JSON.stringify({...row,title_en:'Corrected title',change_note:'Correction'}),'[]']);
    await expect(db.query('SELECT save_journal_article($1,$2)',[JSON.stringify(row),'[]'])).rejects.toMatchObject({code:'40001'});
    const version=(await db.query<{snapshot:{title_en:string|null}}>('SELECT snapshot FROM article_versions WHERE article_id=$1',[row.id])).rows[0];
    expect(version.snapshot.title_en).toBeNull();
  });

  it('preserves previously published records against deletion',async () => {
    await expect(db.query("DELETE FROM articles WHERE slug='paper-1'")).rejects.toMatchObject({code:'23514'});
  });

  it('archives author-only edits and treats blank optional fields as unchanged',async () => {
    let row=(await db.query<Record<string,unknown>>("SELECT * FROM articles WHERE slug='paper-3'")).rows[0];
    const author={full_name:'First author',email:'',affiliation:'Research Institute',country:'UZ',orcid:'',is_corresponding:true,order_index:1};
    const save=async (authors: Array<typeof author>) => (await db.query<{save_journal_article:Record<string,unknown>}>('SELECT save_journal_article($1,$2)',[JSON.stringify(row),JSON.stringify(authors)])).rows[0].save_journal_article;
    row=await save([author]);
    const first=row.revision;
    row=await save([author]);
    expect(row.revision).toBe(first);
    row=await save([{...author,full_name:'Corrected author'}]);
    expect(row.revision).toBe(Number(first)+1);
    const versions=await db.query<{snapshot:{authors:{full_name:string}[]}}>('SELECT snapshot FROM article_versions WHERE article_id=$1 ORDER BY revision DESC LIMIT 1',[row.id]);
    expect(versions.rows[0].snapshot.authors[0].full_name).toBe('First author');
  });

  it('includes versions and release state in the backup snapshot and restore rehearsal',async () => {
    await db.exec("CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint); CREATE TABLE contact_messages(id uuid); CREATE TABLE integration_jobs(id uuid); CREATE TABLE editorial_messages(id uuid); CREATE TABLE staff_accounts(id uuid); CREATE TABLE staff_security(id boolean); CREATE TABLE review_assignments(id uuid);");
    await db.exec(await readFile('supabase/migrations/016_versioned_backups.sql','utf8'));
    const result=await db.query<{snapshot:Record<string,unknown>}>('SELECT journal_backup_snapshot() snapshot');
    expect(result.rows[0].snapshot.article_versions).toBeTruthy();
    expect(result.rows[0].snapshot.collection_releases).toBeTruthy();
    const restored=await db.query<{check:{verified:boolean}}>('SELECT journal_backup_restore_check($1) "check"',[JSON.stringify(result.rows[0].snapshot)]);
    expect(restored.rows[0].check.verified).toBe(true);
  });
});
