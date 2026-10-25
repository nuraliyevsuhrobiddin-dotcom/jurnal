import { describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { NextRequest } from 'next/server';
import { extractManuscriptMetadata } from '@/lib/manuscript-metadata';
import { manuscriptSubmissionSchema } from '@/lib/submission-validation';
import { POST } from '@/app/api/submissions/metadata/route';

vi.mock('@/lib/request-limit', () => ({ protectRequest: vi.fn(async () => null) }));

describe('Multilingual manuscript metadata', () => {
  it('extracts multiline abstracts, explicit author details, keywords and references', () => {
    const metadata = extractManuscriptMetadata(`Title: Climate and agriculture
Corresponding author: Jane Smith
Email: jane@example.org
Affiliation: Research University
Country: United Kingdom
Abstract
First paragraph explains the research question and methods.
Second paragraph explains the findings.
Keywords:
climate; agriculture; modelling
1. Introduction
Body text must not enter the abstract.
References
Smith, J. (2025). Climate research.`);
    expect(metadata).toMatchObject({ title: 'Climate and agriculture', author_name: 'Jane Smith', email: 'jane@example.org', affiliation: 'Research University', country: 'United Kingdom', keywords: 'climate, agriculture, modelling', references: ['Smith, J. (2025). Climate research.'] });
    expect(metadata.abstract).toContain('Second paragraph');
    expect(metadata.abstract).not.toContain('Introduction');
  });

  it('does not mistake ordinary mentions of abstract or keywords for headings', () => {
    const metadata = extractManuscriptMetadata('An abstract approach to mathematics\nWe discuss keywords in information retrieval.\nIntroduction\nFull text.');
    expect(metadata.title).toBe('An abstract approach to mathematics');
    expect(metadata.abstract).toBeUndefined();
    expect(metadata.keywords).toBeUndefined();
    expect(metadata.author_name).toBeUndefined();
  });

  it.each(['uz', 'en', 'ru'])('accepts %s submissions', lang => {
    const result = manuscriptSubmissionSchema.safeParse({ title: 'Research article', abstract: 'A sufficiently long abstract describing research methods and findings.', keywords: 'research', author_name: 'Jane Smith', email: 'jane@example.org', affiliation: 'University', country: 'UK', lang, consent: 'true', original: 'true', reviewed: 'true', template_confirmed: 'true', template_version: '1.0' });
    expect(result.success).toBe(true);
  });

  it('reads a genuine DOCX and returns metadata without document HTML or raw text', async () => {
    const archive = await JSZip.loadAsync(await readFile('tests/fixtures/manuscript.docx'));
    archive.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Title: Climate and agriculture</w:t></w:r></w:p><w:p><w:r><w:t>Abstract: Research findings from a scientific study.</w:t></w:r></w:p><w:p><w:r><w:t>Keywords: climate; agriculture</w:t></w:r></w:p></w:body></w:document>');
    const form = new FormData();
    form.set('file', new File([new Uint8Array(await archive.generateAsync({ type: 'nodebuffer' }))], 'study.docx'));
    const response = await POST(new NextRequest('http://localhost/api/submissions/metadata', { method: 'POST', body: form }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, metadata: { title: 'Climate and agriculture', abstract: 'Research findings from a scientific study.', keywords: 'climate, agriculture' } });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects renamed ZIP files and cross-origin requests', async () => {
    const form = new FormData();
    form.set('file', new File([await readFile('tests/fixtures/ordinary.zip')], 'fake.docx'));
    expect((await POST(new NextRequest('http://localhost/api/submissions/metadata', { method: 'POST', body: form }))).status).toBe(400);
    expect((await POST(new NextRequest('http://localhost/api/submissions/metadata', { method: 'POST', headers: { origin: 'http://other.example' } }))).status).toBe(403);
  });
});
