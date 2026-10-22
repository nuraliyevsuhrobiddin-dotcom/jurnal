import JSZip from 'jszip';
import { createHash, randomUUID } from 'node:crypto';
import { createServerClient } from './supabase/server';

export const backupTables = ['journal_settings','issues','articles','article_authors','article_files','editorial_board','certificates','audit_logs','contact_messages','integration_jobs','editorial_messages','staff_accounts','staff_security','review_assignments'] as const;
const buckets = ['journal-pdfs','journal-manuscripts','journal-covers'];
const maxBytes = 48 * 1024 * 1024;
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export interface BackupManifest { version: 1; id: string; created_at: string; rows: Record<string, number>; files: { path: string; bytes: number; sha256: string }[] }
export function safeBackupPath(name: string) { return !name.includes('\\') && !name.startsWith('/') && !name.split('/').some(p => !p || p === '.' || p === '..') && !/[\x00-\x1f:]/.test(name); }

export async function createBackupArchive(tables: Record<string, unknown[]>, objects: { path: string; bytes: Uint8Array }[], id = randomUUID()) {
  const zip = new JSZip();
  const manifest: BackupManifest = { version: 1, id, created_at: new Date().toISOString(), rows: {}, files: [] };
  let total = 0;
  for (const table of backupTables) {
    if (!Array.isArray(tables[table])) throw new Error(`Missing table: ${table}`);
    manifest.rows[table] = tables[table].length;
    objects = [...objects, { path: `tables/${table}.json`, bytes: Buffer.from(JSON.stringify(tables[table])) }];
  }
  const seen = new Set<string>();
  for (const object of objects) {
    if (!safeBackupPath(object.path) || seen.has(object.path) || object.path === 'manifest.json') throw new Error('Unsafe or duplicate archive path');
    seen.add(object.path); total += object.bytes.length;
    if (total > maxBytes || seen.size > 1500) throw new Error('Backup exceeds online limit. Use provider database/storage backup.');
    zip.file(object.path, object.bytes);
    manifest.files.push({ path: object.path, bytes: object.bytes.length, sha256: hash(object.bytes) });
  }
  zip.file('manifest.json', JSON.stringify(manifest));
  return { bytes: await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }), manifest };
}

export async function verifyBackupArchive(bytes: Uint8Array) {
  if (bytes.length > maxBytes) throw new Error('Archive too large');
  const zip = await JSZip.loadAsync(bytes);
  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) throw new Error('Missing manifest');
  const manifest = JSON.parse(await manifestEntry.async('string')) as BackupManifest;
  if (manifest.version !== 1 || !Array.isArray(manifest.files) || manifest.files.length > 1500 || !manifest.rows) throw new Error('Invalid manifest');
  const seen = new Set<string>(); let total = 0;
  const restored: Record<string, unknown[]> = {};
  for (const item of manifest.files) {
    if (!safeBackupPath(item.path) || seen.has(item.path) || !Number.isSafeInteger(item.bytes) || item.bytes < 0) throw new Error('Invalid manifest entry');
    seen.add(item.path); total += item.bytes;
    if (total > maxBytes) throw new Error('Expanded archive too large');
    const file = zip.file(item.path); if (!file) throw new Error('Missing archive file');
    const content = await file.async('uint8array');
    if (content.length !== item.bytes || hash(content) !== item.sha256) throw new Error('Checksum mismatch');
    if (item.path.startsWith('tables/')) {
      const table = item.path.slice(7, -5); const rows = JSON.parse(Buffer.from(content).toString('utf8'));
      if (!Array.isArray(rows) || rows.length !== manifest.rows[table]) throw new Error('Table row count mismatch');
      restored[table] = rows;
    }
  }
  if (backupTables.some(table => !restored[table])) throw new Error('Incomplete table set');
  if (Object.values(zip.files).some(file => !file.dir && file.name !== 'manifest.json' && !seen.has(file.name))) throw new Error('Unexpected archive entry');
  return { manifest, restored };
}

export async function runContentBackup() {
  const db = createServerClient(); if (!db) throw new Error('Supabase required');
  const { data: tables, error } = await db.rpc('journal_backup_snapshot');
  if (error || !tables) throw new Error('Snapshot failed. Apply migration 014.');
  const objects: { path: string; bytes: Uint8Array }[] = []; let total = 0;
  async function list(bucket: string, prefix = '') {
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await db!.storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error || !data) throw new Error('Storage listing failed');
      for (const entry of data) {
        const name = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (!safeBackupPath(name) || name.split('/').length > 12) throw new Error('Invalid storage path');
        if (!entry.id) { await list(bucket, name); continue; }
        if (objects.length >= 1400 || total + Number(entry.metadata?.size || 0) > maxBytes) throw new Error('Storage exceeds online backup limit');
        const { data: file, error: fileError } = await db!.storage.from(bucket).download(name);
        if (fileError || !file) throw new Error('Storage object missing during snapshot. Retry when editing is complete.');
        const bytes = new Uint8Array(await file.arrayBuffer()); total += bytes.length;
        if (total > maxBytes) throw new Error('Backup exceeds online limit');
        objects.push({ path: `storage/${bucket}/${name}`, bytes });
      }
      if (data.length < 100) break;
    }
  }
  for (const bucket of buckets) await list(bucket);
  const archive = await createBackupArchive(tables, objects);
  const recovered = await verifyBackupArchive(archive.bytes);
  const { data: rehearsal, error: restoreError } = await db.rpc('journal_backup_restore_check', { snapshot: recovered.restored });
  if (restoreError || rehearsal?.verified !== true) throw new Error('Temporary-table restore rehearsal failed');
  const record = { id: archive.manifest.id, created_at: archive.manifest.created_at, tables: backupTables.length, files: objects.length, bytes: archive.bytes.length, verified: true };
  const { error: uploadError } = await db.storage.from('journal-backups').upload(`${record.id}.zip`, archive.bytes, { contentType: 'application/zip', upsert: false });
  if (uploadError) throw new Error('Private backup upload failed');
  const { error: saveError } = await db.from('backup_runs').insert(record);
  if (saveError) throw new Error('Backup record not saved');
  return record;
}
