import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { PDFDocument, PDFDict, PDFName } from 'pdf-lib';
import sharp from 'sharp';
import { manuscriptToPdf, manuscriptBodyBlocks, publicationBodyPageCount, linearizeWordEquations } from '@/lib/pdf/manuscript-conversion';
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
  it('keeps the full source PDF after its separate journal cover', async () => {
    const source = await PDFDocument.create(); source.addPage().drawText('Full research body');
    const bytes = await manuscriptToPdf(await source.save(), 'pdf', settings);
    const result = await PDFDocument.load(await assemblePublicationPdf(journalStore.articles[0], settings, bytes));
    expect(result.getPageCount()).toBe(2);
    expect(publicationBodyPageCount(result)).toBe(1);
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
  it.each(['<w:object/>', '<w:sym w:font="Symbol" w:char="F061"/>'])('refuses to silently lose unsupported embedded objects: %s', async element => {
    await expect(manuscriptToPdf(await docx(`<w:p><w:r><w:t>Research</w:t></w:r></w:p>${element}`), 'docx', settings)).rejects.toThrow('Word’dan PDF');
  });
  it('accepts a Word table and superscript without asking for a PDF', async () => {
    const body = '<w:p><w:r><w:t>Research table</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Group A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Result 42</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:r><w:t>E = mc</w:t></w:r><w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:t>2</w:t></w:r></w:p>';
    const bytes = await manuscriptToPdf(await docx(body), 'docx', settings);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
  it('preserves common Word equation operands and fraction structure', async () => {
    const equation = '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:f><m:num><m:r><m:t>x+1</m:t></m:r></m:num><m:den><m:r><m:t>y</m:t></m:r></m:den></m:f></m:oMath>';
    const body = `<w:p><w:r><w:t>Research formula</w:t></w:r>${equation}</w:p>`;
    expect(linearizeWordEquations(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`)).toContain('(x+1)/(y)');
    expect((await PDFDocument.load(await manuscriptToPdf(await docx(body), 'docx', settings))).getPageCount()).toBe(1);
  });
  it('embeds a Word figure into the downloadable PDF', async () => {
    const body = '<w:p><w:r><w:t>Scientific figure and findings</w:t></w:r></w:p><w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rIdFigure"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
    const zip = await JSZip.loadAsync(await docx(body));
    zip.file('word/media/figure.png', await sharp({ create: { width: 120, height: 80, channels: 3, background: '#0d6163' } }).png().toBuffer());
    const rels = 'word/_rels/document.xml.rels';
    const existing = await zip.file(rels)?.async('string') || '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    zip.file(rels, existing.replace('</Relationships>', '<Relationship Id="rIdFigure" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/figure.png"/></Relationships>'));
    const types = await zip.file('[Content_Types].xml')!.async('string');
    zip.file('[Content_Types].xml', types.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>'));
    const pdf = await PDFDocument.load(await manuscriptToPdf(await zip.generateAsync({ type: 'uint8array' }), 'docx', settings));
    const images = pdf.getPage(0).node.Resources()?.lookup(PDFName.of('XObject'), PDFDict);
    expect(images?.keys().length).toBeGreaterThanOrEqual(1);
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
