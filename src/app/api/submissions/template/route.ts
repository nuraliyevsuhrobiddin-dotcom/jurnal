import JSZip from 'jszip';

export const runtime = 'nodejs';

export async function GET() {
  const paragraphs = [
    'Title: Replace this with your English article title',
    'Corresponding author: Replace with full name',
    'Email: author@example.org',
    'Affiliation: Replace with institution or organisation',
    'Country: Replace with country',
    'Coauthors: Add all coauthors and their affiliations here, and enter each coauthor in the online form.',
    'Abstract',
    'Replace this paragraph with your English abstract. Explain the research question, methods, principal findings and their significance. Keep the Abstract and Keywords headings on separate lines. Review every extracted field before submitting.',
    'Keywords: first keyword; second keyword; third keyword',
    '1. Introduction',
    'Replace this paragraph with the introduction in English.',
    '2. Methods',
    'Describe the materials, methods and analysis in English.',
    '3. Results',
    'Report the results in English.',
    '4. Discussion',
    'Discuss the findings, implications and limitations in English.',
    '5. Conclusion',
    'Summarise the conclusions in English.',
    'References',
    'Replace with complete references in a consistent citation style.',
  ];
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.map(text => `<w:p><w:r><w:t>${escape(text)}</w:t></w:r></w:p>`).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`);
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return new Response(new Uint8Array(bytes).buffer, { headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': 'attachment; filename="AGM-English-manuscript-template.docx"',
    'Cache-Control': 'public, max-age=86400',
  } });
}
