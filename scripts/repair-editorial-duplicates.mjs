// Preview by default. --apply archives exact duplicates after taking a backup.
import fs from 'node:fs/promises';
import path from 'node:path';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
const { loadEnvConfig } = nextEnv;

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase server credentials are required.');
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.from('editorial_board').select('*').eq('is_active', true).order('created_at').order('id');
  if (error) throw error;
  const ignored = new Set(['id', 'created_at', 'updated_at', 'order_index']);
  const seen = new Map(); const duplicates = [];
  for (const member of data) {
    const key = JSON.stringify(Object.keys(member).filter(key => !ignored.has(key)).sort().map(key => [key, member[key] ?? null]));
    if (seen.has(key)) duplicates.push({ member, kept: seen.get(key) }); else seen.set(key, member.id);
  }
  console.log(JSON.stringify({ active: data.length, identicalDuplicates: duplicates.length, retained: seen.size, apply: process.argv.includes('--apply') }));
  if (!process.argv.includes('--apply') || !duplicates.length) return;
  const directory = path.join(process.cwd(), '.data', 'backups');
  await fs.mkdir(directory, { recursive: true });
  const backup = path.join(directory, `editorial-${Date.now()}.json`);
  await fs.writeFile(backup, JSON.stringify({ records: data, archiveIds: duplicates.map(item => item.member.id) }, null, 2), { mode: 0o600, flag: 'wx' });
  let archived = 0;
  for (const { member, kept } of duplicates) {
    const result = await client.from('editorial_board').update({ is_active: false }).eq('id', member.id).eq('is_active', true).select('id');
    if (result.error) throw result.error;
    if (result.data.length) {
      archived++;
      const audit = await client.from('audit_logs').insert({ action: 'EDITORIAL_DUPLICATE_ARCHIVE', entity_type: 'editorial_board', entity_id: member.id, details: { retained_id: kept, reason: 'Identical repeated record; archived, not deleted.' } });
      if (audit.error) throw audit.error;
    }
  }
  console.log(JSON.stringify({ archived, backup: path.relative(process.cwd(), backup), reversible: true }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
