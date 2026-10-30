import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { generateManuscriptTemplate } from '@/lib/manuscript-template';
import { manuscriptStandard, publicationStandardCopy } from '@/lib/manuscript-standard';
import { manuscriptToPdf } from '@/lib/pdf/manuscript-conversion';
import { parseDocxFile } from '@/lib/pdf/docx-parser';
import { journalStore } from '@/lib/data-store';
import { GET } from '@/app/api/submissions/template/route';
import { getPolicyDocument } from '@/lib/policies';

describe('Unified manuscript standard', () => {
  it.each(['uz', 'ru', 'en'] as const)('provides a styled, numbered %s template that can be converted after completion', async lang => {
    const zip = await JSZip.loadAsync(await generateManuscriptTemplate(lang));
    const document = await zip.file('word/document.xml')!.async('string');
    const styles = await zip.file('word/styles.xml')!.async('string');
    expect(document).toContain('<w:pgSz w:w="11906" w:h="16838"/>');
    expect(document).toContain('w:top="1134"');
    expect(styles).toContain('Times New Roman');
    expect(styles).toContain('w:line="360"');
    expect(styles).toContain('w:firstLine="709"');
    expect(await zip.file('word/footer1.xml')!.async('string')).toContain('w:instr="PAGE"');
    for (const declaration of ['AUTHOR_CONTRIBUTIONS', 'FUNDING', 'COMPETING_INTERESTS', 'DATA_AVAILABILITY', 'ETHICS_AND_CONSENT', 'AI_DISCLOSURE']) expect(document).toContain(`{{${declaration}}}`);
    zip.file('word/document.xml', document.replace(/\{\{[A-Z_]+\}\}/g, 'Completed scientific information'));
    const completed = await zip.generateAsync({ type: 'uint8array' });
    const parsed = await parseDocxFile(Buffer.from(completed));
    expect(parsed.warnings).toEqual([]);
    const publication = await PDFDocument.load(await manuscriptToPdf(completed, 'docx', journalStore.settings, journalStore.articles[0]));
    expect(publication.getPageCount()).toBeGreaterThan(1);
    expect(publication.getKeywords()).toContain('AGM_FULL_ARTICLE_V2');
    const policy = getPolicyDocument('guidelines', lang, journalStore.settings);
    expect(JSON.stringify(policy)).toContain(manuscriptStandard.font);
    expect(JSON.stringify(policy)).toContain(publicationStandardCopy[lang]);
    expect(JSON.stringify(getPolicyDocument('journal-charter', lang, journalStore.settings))).toContain(manuscriptStandard.font);
  });
  it('defaults to Uzbek and identifies the standard version in downloads', async () => {
    const response = await GET();
    expect(response.headers.get('content-disposition')).toContain('AGM-uz-manuscript-template.docx');
    expect(response.headers.get('x-manuscript-standard')).toBe(manuscriptStandard.version);
    expect((await GET(new Request('http://localhost/api/submissions/template?lang=xx'))).status).toBe(400);
  });
});
