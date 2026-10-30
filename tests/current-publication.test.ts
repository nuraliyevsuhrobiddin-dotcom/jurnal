import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { journalStore } from '@/lib/data-store';
import { readManuscript } from '@/lib/manuscript-storage';
import { attachPublicationCover } from '@/lib/pdf/generator';
import { prepareCurrentPublicationPdf } from '@/lib/pdf/current-publication';

vi.mock('@/lib/manuscript-storage', () => ({ readManuscript: vi.fn() }));

describe('current publication PDF delivery', () => {
  beforeEach(() => vi.mocked(readManuscript).mockReset());

  it('rebuilds a legacy PDF publication from its original PDF without the duplicate cover', async () => {
    const article = {
      ...journalStore.articles[0],
      manuscript_file_url: '/api/admin/manuscripts/01234567-89ab-4cde-8fab-0123456789ab',
    };
    const source = await PDFDocument.create();
    source.addPage().drawText('Original article metadata and research');
    const sourceBytes = await source.save();
    const oldPublication = await attachPublicationCover(article, journalStore.settings, sourceBytes);
    expect((await PDFDocument.load(oldPublication)).getPageCount()).toBe(2);
    vi.mocked(readManuscript).mockResolvedValue({
      metadata: {
        id: '01234567-89ab-4cde-8fab-0123456789ab',
        name: 'original.pdf', extension: 'pdf', contentType: 'application/pdf', size: sourceBytes.length,
      },
      bytes: sourceBytes,
    });

    const current = await prepareCurrentPublicationPdf(article, journalStore.settings, oldPublication);
    const result = await PDFDocument.load(current);
    expect(result.getPageCount()).toBe(1);
    expect(result.getKeywords()).toContain('AGM_COVER_PAGES:0');
  });
});
