import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { citationData } from '@/lib/citation-data';
import { CitationBox } from '@/components/article/CitationBox';
import { journalStore } from '@/lib/data-store';

describe('Public citation data', () => {
  it('excludes private article, author and issue fields before client serialization', () => {
    const source = journalStore.articles[0];
    const article = { ...source, submission_notes: 'SECRET_EDITORIAL_NOTE', manuscript_file_url: '/api/admin/manuscripts/SECRET_SOURCE',
      pdf_storage_path: 'SECRET_STORAGE.pdf', authors: source.authors!.map(author => ({ ...author, email: 'SECRET_EMAIL@example.test' })),
      issue: { ...journalStore.issues[0], description_uz: 'SECRET_ISSUE_FIELD' } };
    const data = citationData(article);
    expect(JSON.stringify(data)).not.toContain('SECRET_');
    expect(data.authors).toEqual(article.authors.map(author => ({ full_name: author.full_name })));
    const html = renderToStaticMarkup(<CitationBox article={data} />);
    expect(html).toContain(article.title_uz);
    expect(html).not.toContain('SECRET_');
    expect(html).toContain(`${article.issue.volume}(${article.issue.issue_number})`);
    expect(html).toContain(`/api/articles/${article.id}/citation?format=ris`);
  });
});
