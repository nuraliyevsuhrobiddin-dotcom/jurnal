import JSZip from 'jszip';
import { createHash } from 'node:crypto';
import type { Article, JournalSettings } from '@/types/journal';
import { publicArticleMetadata, dublinCore } from './scholarly-feeds';
import { exportCitation } from './citation-export';
import { readArticlePdf } from './pdf/storage';
import { IntegrationError } from './integration-config';

export async function archivePackage(articles: Article[], settings: JournalSettings) {
  const published = articles.filter(article => article.status === 'published');
  if (!published.length || published.length > 25) throw new IntegrationError('Arxiv uchun 1–25 ta maqolali jurnal sonini tanlang.', 422);
  const zip = new JSZip();
  const entries: { article_id: string; pdf: string; sha256: string; bytes: number }[] = [];
  let size = 0;
  for (const article of published) {
    if (!/^[a-f0-9-]{36}$/i.test(article.id)) throw new IntegrationError('Maqola identifikatori noto‘g‘ri.', 422);
    const bytes = await readArticlePdf(article.id);
    if (!bytes) throw new IntegrationError(`Arxiv to‘liq emas: ${article.id} PDF fayli topilmadi.`, 422);
    size += bytes.length;
    if (size > 20 * 1024 * 1024) throw new IntegrationError('Arxiv 20 MB dan oshdi. Kichikroq jurnal sonini tanlang.', 422);
    const prefix = `articles/${article.id}`;
    zip.file(`${prefix}/article.pdf`, bytes);
    zip.file(`${prefix}/metadata.json`, JSON.stringify(publicArticleMetadata(article, settings, 'en'), null, 2));
    zip.file(`${prefix}/dublin-core.xml`, `<?xml version="1.0" encoding="UTF-8"?>${dublinCore(article, settings)}`);
    zip.file(`${prefix}/citation.ris`, exportCitation(article, settings.journal_name, 'en', 'ris'));
    entries.push({ article_id: article.id, pdf: `${prefix}/article.pdf`, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
  }
  zip.file('manifest.json', JSON.stringify({ format: 'agm-publication-archive-v1', generated_at: new Date().toISOString(), journal: settings.journal_name, entries }, null, 2));
  zip.file('README.txt', 'Published article PDFs and public metadata only. Verify PDF SHA-256 checksums against manifest.json. This export is not a full database backup or evidence of CLOCKSS/LOCKSS preservation.\n');
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 3 } });
}
