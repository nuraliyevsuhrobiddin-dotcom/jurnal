import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { manuscriptToPdf, manuscriptBodyBlocks, publicationBodyPageCount } from '@/lib/pdf/manuscript-conversion';
import { generateArticleTitlePagePdf, assemblePublicationPdf } from '@/lib/pdf/generator';
import { generatePolicyPdf } from '@/lib/pdf/policy-generator';
import { getPolicyDocument } from '@/lib/policies';
import { journalStore } from '@/lib/data-store';
import { parseDocxFile } from '@/lib/pdf/docx-parser';

const settings = journalStore.settings;
async function docx(body: string) {
  const zip = await JSZip.loadAsync(await readFile('tests/fixtures/manuscript.docx'));
  const xml = await zip.file('word/document.xml')!.async('string');
  zip.file('word/document.xml', xml.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>${body}</w:body>`));
  return zip.generateAsync({ type: 'uint8array' });
}
describe('Full manuscript conversion', () => {
  it.each(['‘', '’', 'ʻ', 'ʼ', "'"])('extracts Uzbek keywords with apostrophe %s without including the full body in the abstract', async apostrophe => {
    const body = ['Research title', 'Annotatsiya: Research summary and evidence.', `Kalit so${apostrophe}zlar: pedagogika, ta’lim`, 'Kirish', 'Complete scientific body text.'].map(text => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`).join('');
    const parsed = await parseDocxFile(Buffer.from(await docx(body)));
    expect(parsed.extractedKeywords).toEqual(['pedagogika', 'ta’lim']);
    expect(parsed.extractedAbstract).toBe('Research summary and evidence.');
  });
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
  it('rejects a previously prepared article instead of adding another journal frame', async () => {
    const source = await PDFDocument.create();
    source.addPage().drawText('Full research body');
    const prepared = await assemblePublicationPdf(journalStore.articles[0], settings, await source.save());
    await expect(manuscriptToPdf(prepared, 'pdf', settings)).rejects.toThrow('asl PDF yoki DOCX');
  });
  it('converts the complete DOCX body including text after the abstract over multiple pages', async () => {
    const body = '<w:p><w:r><w:t>Title</w:t></w:r></w:p>' + Array.from({ length: 100 }, (_, i) => `<w:p><w:r><w:t>Research body paragraph ${i}: methods, results and conclusions.</w:t></w:r></w:p>`).join('');
    const pdf = await PDFDocument.load(await manuscriptToPdf(await docx(body), 'docx', settings));
    expect(pdf.getPageCount()).toBeGreaterThan(3);
  });
  it.each(['<w:tbl/>', '<w:drawing/>', '<w:rPr><w:vertAlign w:val="superscript"/></w:rPr>', '<w:sym w:font="Symbol" w:char="F061"/>', '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"/>'])('refuses to silently lose scientific content: %s', async element => {
    await expect(manuscriptToPdf(await docx(`<w:p><w:r><w:t>Research</w:t></w:r></w:p>${element}`), 'docx', settings)).rejects.toThrow('Word’dan PDF');
  });
  it('retains the research preceding a Results paragraph and unmatched abstract text', () => {
    const article = journalStore.articles[0];
    const block = (text: string) => ({ tag: 'p', runs: [{ text, bold: false }] });
    const blocks = [block(article.title_uz), block('Abstract: An updated scientific summary.'), block('Research context and evidence.'), block('Results showed significant differences.')];
    expect(manuscriptBodyBlocks(blocks, article)).toEqual(blocks.slice(1));
    expect(manuscriptBodyBlocks(blocks.slice(2), article)).toEqual(blocks.slice(2));
  });
  it('removes only matching cover metadata, preserving words split by inline formatting', () => {
    const article = journalStore.articles[0];
    const title = { tag: 'p', runs: [{ text: article.title_uz.slice(0, 5), bold: true }, { text: article.title_uz.slice(5), bold: false }] };
    const abstract = { tag: 'p', runs: [{ text: `Abstract: ${article.abstract_uz}`, bold: false }] };
    const body = { tag: 'h1', runs: [{ text: 'Introduction', bold: true }] };
    expect(manuscriptBodyBlocks([title, abstract, body], article)).toEqual([body]);
  });
  it('does not trust a body-page marker exceeding the actual document', async () => {
    const pdf = await PDFDocument.create(); pdf.addPage();
    pdf.setKeywords(['AGM_BODY_PAGES:999']);
    expect(publicationBodyPageCount(pdf)).toBe(1);
  });
});
