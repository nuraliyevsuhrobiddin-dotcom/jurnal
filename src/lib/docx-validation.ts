/** Inspect the ZIP directory before storing a Word manuscript. No archive is extracted. */
export function isDocxArchive(bytes: Uint8Array): boolean {
  const data = Buffer.from(bytes);
  if (data.length < 22) return false;
  let end = -1;
  for (let at = data.length - 22; at >= Math.max(0, data.length - 65557); at--) {
    if (data.readUInt32LE(at) === 0x06054b50 && at + 22 + data.readUInt16LE(at + 20) === data.length) { end = at; break; }
  }
  if (end < 0 || data.readUInt16LE(end + 4) || data.readUInt16LE(end + 6)) return false;
  const count = data.readUInt16LE(end + 10), size = data.readUInt32LE(end + 12), start = data.readUInt32LE(end + 16);
  if (!count || count > 1000 || count !== data.readUInt16LE(end + 8) || start + size !== end) return false;
  let at = start, expanded = 0;
  const names = new Set<string>();
  for (let index = 0; index < count; index++) {
    if (at + 46 > end || data.readUInt32LE(at) !== 0x02014b50) return false;
    const flags = data.readUInt16LE(at + 8), method = data.readUInt16LE(at + 10);
    const compressed = data.readUInt32LE(at + 20), uncompressed = data.readUInt32LE(at + 24);
    const nameSize = data.readUInt16LE(at + 28), extra = data.readUInt16LE(at + 30), comment = data.readUInt16LE(at + 32);
    const local = data.readUInt32LE(at + 42);
    if (flags & 1 || (method !== 0 && method !== 8) || data.readUInt16LE(at + 34) || at + 46 + nameSize + extra + comment > end || local + 30 > start) return false;
    if (data.readUInt32LE(local) !== 0x04034b50) return false;
    const body = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28);
    if (body + compressed > start) return false;
    expanded += uncompressed;
    if (expanded > 80 * 1024 * 1024) return false;
    const name = data.subarray(at + 46, at + 46 + nameSize).toString('utf8');
    if (names.has(name) || name.startsWith('/') || name.split('/').includes('..')) return false;
    names.add(name); at += 46 + nameSize + extra + comment;
  }
  return at === end && names.has('[Content_Types].xml') && names.has('word/document.xml');
}
