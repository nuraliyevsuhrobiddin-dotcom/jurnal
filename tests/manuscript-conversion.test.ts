import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { manuscriptToPdf } from '@/lib/pdf/manuscript-conversion';
import { generateArticleTitlePagePdf, assemblePublicationPdf } from '@/lib/pdf/generator';
import { generatePolicyPdf } from '@/lib/pdf/policy-generator';
import { getPolicyDocument } from '@/lib/policies';
import { journalStore } from '@/lib/data-store';

const settings = journalStore.settings;
async function docx(body: string) {
  const zip = await JSZip.loadAsync(await readFile('tests/fixtures/manuscript.docx'));
  const xml = await zip.file('word/document.xml')!.async('string');
  zip.file('word/document.xml', xml.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>${body}</w:body>`));
  return zip.generateAsync({ type: 'uint8array' });
}
describe('Full manuscript conversion', () => {
  it('keeps all source PDF pages and never prepends an abstract sheet', async () => {
    const source = await PDFDocument.create(); source.addPage().drawText('Full research body');
    const bytes = await manuscriptToPdf(await source.save(), 'pdf', settings);
    const result = await PDFDocument.load(await assemblePublicationPdf(journalStore.articles[0], settings, bytes));
    expect(result.getPageCount()).toBe(1);
    expect(result.getKeywords()).toContain('AGM_FULL_ARTICLE_V2');
  });
  it('rejects a metadata-only PDF and the actual journal author guidelines', async () => {
    const metadata = await generateArticleTitlePagePdf(journalStore.articles[0], settings);
    await expect(manuscriptToPdf(metadata, 'pdf', settings)).rejects.toThrow('annotatsiya');
    const policy = getPolicyDocument('guidelines', 'uz', settings);
    const guide = await generatePolicyPdf({ documents: [policy], settings, lang: 'uz', title: policy.title, verificationUrl: 'https://example.com', hash: 'test' });
    await expect(manuscriptToPdf(guide, 'pdf', settings)).rejects.toThrow('qo‘llanmasi');
  });
  it('converts the complete DOCX body including text after the abstract over multiple pages', async () => {
    const body = '<w:p><w:r><w:t>Title</w:t></w:r></w:p>' + Array.from({ length: 100 }, (_, i) => `<w:p><w:r><w:t>Research body paragraph ${i}: methods, results and conclusions.</w:t></w:r></w:p>`).join('');
    const pdf = await PDFDocument.load(await manuscriptToPdf(await docx(body), 'docx', settings));
    expect(pdf.getPageCount()).toBeGreaterThan(3);
  });
  it.each(['<w:tbl/>', '<w:drawing/>', '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"/>'])('refuses to silently lose scientific content: %s', async element => {
    await expect(manuscriptToPdf(await docx(`<w:p><w:r><w:t>Research</w:t></w:r></w:p>${element}`), 'docx', settings)).rejects.toThrow('Word’dan PDF');
  });
});
