import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { subjectCollections, resolveSubjectId, matchesSubject, readSubjectMetadata, writeSubjectMetadata } from '@/lib/subjects';
import { normalizeRemoteArticle } from '@/lib/remote-db';
import { journalStore } from '@/lib/data-store';
import { buildIssueCollection } from '@/lib/pdf/issue-collection';

const article = (title: string) => ({ ...journalStore.articles[0], title_uz: title, title_en: undefined, title_ru: undefined, abstract_uz: '', abstract_en: undefined, abstract_ru: undefined, keywords_uz: [], keywords_en: [], keywords_ru: [], subject_id: undefined });
describe('Primary subject publishing', () => {
  it.each([
    ['Physics and mathematical models', 'natural-sciences'], ['Software engineering and computer technology', 'engineering-technology'],
    ['Clinical medicine and public health', 'medicine-life-sciences'], ['Business economics and financial management', 'economics-business'],
    ['Social policy and law', 'social-sciences'], ['Pedagogika va ta’lim', 'education-humanities'],
    ['Солнечная энергетика и технологии', 'engineering-technology'], ['A research overview', 'multidisciplinary'],
  ])('classifies %s consistently', (title, id) => expect(resolveSubjectId(article(title))).toBe(id));
  it('avoids substring false positives and respects an explicit editorial decision', () => {
    expect(resolveSubjectId(article('A flawless approach'))).toBe('multidisciplinary');
    const paper = { ...article('Clinical medicine'), subject_id: 'social-sciences' };
    expect(resolveSubjectId(paper)).toBe('social-sciences');
    expect(subjectCollections.filter(subject => matchesSubject(paper, subject))).toHaveLength(1);
  });
  it('uses multidisciplinary for equally supported disciplines', () => {
    const paper = { ...article('Research study'), keywords_uz: ['physics', 'biology'] };
    expect(resolveSubjectId(paper)).toBe('multidisciplinary');
  });
  it('round-trips the manual subject atomically with the article without polluting notes or keywords', () => {
    const notes = 'Author submission and consent details';
    const encoded = writeSubjectMetadata('medicine-life-sciences', notes);
    const restored = normalizeRemoteArticle({ ...article('Research'), submission_notes: encoded });
    expect(restored.subject_id).toBe('medicine-life-sciences'); expect(restored.submission_notes).toBe(notes);
    expect(writeSubjectMetadata('auto', encoded)).toBe(notes);
    expect(readSubjectMetadata(notes).subject_id).toBeUndefined();
    expect(writeSubjectMetadata('social-sciences', encoded)?.match(/AGM_SUBJECT/g)).toHaveLength(1);
  });
  it('puts only the selected discipline into its PDF with its own cover and contents', async () => {
    const issue = { ...journalStore.issues[0], cover_image_url: undefined };
    const source = await PDFDocument.create(); source.addPage();
    const reader = vi.fn(async () => source.save());
    const papers = [
      { ...article('Computer software'), id: 'engineering', issue_id: issue.id, status: 'published' as const },
      { ...article('Clinical medicine'), id: 'medicine', issue_id: issue.id, status: 'published' as const },
    ];
    const pdf = await PDFDocument.load(await buildIssueCollection(issue, papers, journalStore.settings, reader, 'medicine-life-sciences'));
    expect(reader.mock.calls).toHaveLength(1); expect(reader.mock.calls[0]).toEqual(['medicine']);
    expect(pdf.getPageCount()).toBe(4); expect(pdf.getTitle()).toContain('Medicine & life sciences');
    await expect(buildIssueCollection(issue, papers, journalStore.settings, reader, 'social-sciences')).rejects.toMatchObject({ status: 404 });
  });
});
