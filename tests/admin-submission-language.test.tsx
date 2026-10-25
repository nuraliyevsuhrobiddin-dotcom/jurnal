import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { ArticleEditor } from '@/components/admin/ArticleEditor';
import { POST } from '@/app/api/admin/articles/route';
import { createArticle } from '@/lib/db';
import { journalStore } from '@/lib/data-store';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/admin-access', () => ({ adminAccess: async () => null }));
vi.mock('@/lib/db', () => ({ createArticle: vi.fn(async data => ({ ...data, id: 'new-article' })), getAllArticlesAdmin: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('Admin manuscript languages', () => {
  it.each(['uz', 'ru', 'en'] as const)('creates a %s draft without imposing an English language detector', async language => {
    const title = language === 'ru' ? 'Исследование научных методов' : 'Ilmiy tadqiqot usullari va natijalari';
    const abstract = 'Ushbu maqola ilmiy tadqiqot natijalari va usullarini tahlil qiladi. '.repeat(3);
    const data = { ...journalStore.articles[0], status: 'draft', original_language: language, title_uz: title, abstract_uz: abstract, title_en: undefined, abstract_en: undefined, keywords_en: [], [`title_${language}`]: title, [`abstract_${language}`]: abstract, [`keywords_${language}`]: ['tadqiqot'] };
    const response = await POST(new NextRequest('http://localhost/api/admin/articles', { method: 'POST', body: JSON.stringify(data) }));
    expect(response.status).toBe(201);
    expect(createArticle).toHaveBeenCalledWith(expect.objectContaining({ original_language: language, [`title_${language}`]: title }));
  });

  it.each(['uz', 'ru'] as const)('loads existing %s metadata into editable required fields', language => {
    const article = { ...journalStore.articles[0], original_language: language, title_en: undefined, abstract_en: undefined, title_ru: 'Научное исследование', abstract_ru: 'Аннотация научного исследования' };
    const html = renderToStaticMarkup(<ArticleEditor initialArticle={article} />);
    expect(html).toContain(article[`title_${language}`]!);
    expect(html).toContain(article[`abstract_${language}`]!);
    expect(html).toContain(`<option value="${language}" selected=""`);
    expect(html).not.toContain('Article title (English)');
  });
});
