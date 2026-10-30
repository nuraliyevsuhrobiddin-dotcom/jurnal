import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase server configuration is required. No credentials are printed.');
  process.exit(1);
}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(15000)})}});
const checks=[
  ['Publication columns',()=>db.from('articles').select('id,revision,first_published_at,subject_id,pdf_storage_path,change_note').limit(0)],
  ['Persistent collection releases',()=>db.rpc('journal_collection_summary',{selected_issue:null})],
  ['Database catalog pagination',()=>db.rpc('catalog_article_page',{search_query:'',selected_issue:null,selected_subject:null,page_number:1,page_size:1})],
  ['Article version history',()=>db.from('article_versions').select('id,article_id,revision,snapshot,pdf_storage_path,change_note').limit(0)],
];
let failures=0;
for(const [label,run] of checks){try{const result=await run();if(result.error)throw new Error();console.log(`[OK] ${label}`);}catch{failures++;console.error(`[ERROR] ${label}: apply migrations 015 and 016 before promotion.`);}}
const restored=await db.rpc('journal_backup_snapshot');
if(restored.error||!Array.isArray(restored.data?.article_versions)||!Array.isArray(restored.data?.collection_releases)){failures++;console.error('[ERROR] Versioned backup snapshot: apply migration 016.');}
else console.log('[OK] Versioned backup snapshot');
console.log(`Publication upgrade: ${failures} errors. No records were changed.`);
process.exitCode=failures?1:0;
