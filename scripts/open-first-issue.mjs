// Run once with: node scripts/open-first-issue.mjs --date=YYYY-MM-DD --apply
// Without --apply this only previews the planned record. Existing issues are never replaced.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());

async function main() {
  const date = process.argv.find(arg => arg.startsWith('--date='))?.slice(7);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new Error('Supply --date=YYYY-MM-DD');
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: issues, error } = await client.from('issues').select('*');
  if (error) throw error;
  if (issues.length) { console.log(JSON.stringify({ result: 'unchanged', reason: 'Issues already exist', issues: issues.map(i => ({ id: i.id, volume: i.volume, issue: i.issue_number, current: i.is_current })) })); return; }
  const { data: row, error: settingsError } = await client.from('journal_settings').select('value').eq('key', 'general').single();
  if (settingsError) throw settingsError;
  const year = Number(date.slice(0, 4)), now = new Date().toISOString(), id = randomUUID();
  const issue = { id, volume: 1, issue_number: 1, year, is_current: true, publication_date: date,
    title_en: `Volume 1, Issue 1 (${year})`, title_uz: `1-jild, 1-son (${year})`, title_ru: `Том 1, выпуск 1 (${year})`,
    description_en: 'Multidisciplinary research in science, technology, economics, education and the humanities. Submissions are open; accepted articles appear after editorial review and publication.',
    description_uz: 'Fan, texnologiya, iqtisodiyot, ta’lim va gumanitar yo‘nalishlardagi tadqiqotlar. Maqolalar qabul qilinmoqda; qabul qilingan ishlar tahririy tekshiruv va nashrdan so‘ng joylashtiriladi.',
    description_ru: 'Междисциплинарные исследования в области науки, технологий, экономики, образования и гуманитарных дисциплин. Приём статей открыт; принятые работы появятся после редакционной проверки и публикации.',
    created_at: now, updated_at: now };
  if (!process.argv.includes('--apply')) { console.log(JSON.stringify({ result: 'preview', issue })); return; }
  const filename = path.resolve('src/lib/issues/cover-art.ts');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  const { issueCoverSvg } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  const png = await sharp(Buffer.from(issueCoverSvg(issue, row.value))).png().toBuffer();
  const key = `issues/${id}.png`;
  const { error: uploadError } = await client.storage.from('journal-covers').upload(key, png, { contentType: 'image/png', upsert: false, cacheControl: '31536000' });
  if (uploadError) throw uploadError;
  issue.cover_image_url = client.storage.from('journal-covers').getPublicUrl(key).data.publicUrl;
  const { error: saveError } = await client.rpc('save_journal_issue', { issue_data: issue });
  if (saveError) throw saveError;
  const { data: saved, error: verifyError } = await client.from('issues').select('*').eq('id', id).single();
  if (verifyError || !saved?.is_current) throw verifyError || new Error('Issue verification failed');
  fs.mkdirSync('public/images/issues', { recursive: true });
  fs.writeFileSync(`public/images/issues/agm-${year}-v1-n1.png`, png);
  fs.mkdirSync('artifacts', { recursive: true }); fs.writeFileSync('artifacts/first-issue-record.json', JSON.stringify(saved, null, 2));
  const audit = await client.from('audit_logs').insert({ id: randomUUID(), user_email: 'admin@agmjoural.uz', action: 'ISSUE_CREATE', entity_type: 'issue', entity_id: id,
    details: { volume: 1, issue: 1, year, source: 'authorized launch setup' }, ip_address: '127.0.0.1', created_at: now });
  console.log(JSON.stringify({ result: 'created', id, volume: 1, issue: 1, year, current: saved.is_current, cover: saved.cover_image_url, auditSaved: !audit.error }));
}
main().catch(error => { console.error(error.message || 'Issue setup failed'); process.exitCode = 1; });
