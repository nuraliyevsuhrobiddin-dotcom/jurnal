import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, after } from 'next/server';
import { PATCH } from '@/app/api/admin/articles/[id]/route';
import { drainNotificationQueue, mailConfigured } from '@/lib/notifications';
import { journalStore } from '@/lib/data-store';
import { getArticleById, updateArticle } from '@/lib/db';

vi.mock('next/server', async original => ({ ...await original<typeof import('next/server')>(), after: vi.fn() }));
vi.mock('@/lib/admin-access', () => ({ adminAccess: async () => null }));
vi.mock('@/lib/db', () => ({
  getArticleById: vi.fn(async () => journalStore.articles[0]),
  updateArticle: vi.fn(async () => journalStore.articles[0]),
}));
vi.mock('@/lib/publication-notifications', () => ({ queueArticleNotifications: async () => [] }));
vi.mock('@/lib/notifications', () => ({ mailConfigured: vi.fn(() => true), drainNotificationQueue: vi.fn() }));

beforeEach(() => { vi.clearAllMocks(); vi.mocked(getArticleById).mockResolvedValue(journalStore.articles[0]); vi.mocked(mailConfigured).mockReturnValue(true); });
const save = () => PATCH(new NextRequest('http://localhost/api/admin/articles/test', { method: 'PATCH', body: '{}' }), { params: Promise.resolve({ id: journalStore.articles[0].id }) });

describe('Article save email recovery', () => {
  it('preserves publication and PDF when hosted authors are saved unchanged', async () => {
    const article = { ...journalStore.articles[0], pdf_url: '/published.pdf', pdf_file_size: 123,
      authors: journalStore.articles[0].authors!.map(author => ({ ...author, created_at: '2026-10-01T00:00:00Z' })) };
    vi.mocked(getArticleById).mockResolvedValue(article);
    const authors = article.authors.map(author => ({ ...author, email: author.email || '', orcid: author.orcid || '' }));
    const response = await PATCH(new NextRequest('http://localhost/api/admin/articles/test', { method: 'PATCH', body: JSON.stringify({ authors }) }), { params: Promise.resolve({ id: article.id }) });
    expect(response.status).toBe(200);
    const updates = vi.mocked(updateArticle).mock.calls[0][1];
    expect(updates).not.toHaveProperty('pdf_url');
    expect(updates).not.toHaveProperty('pdf_storage_path');
    expect(updates).not.toHaveProperty('status');
  });
  it('still invalidates the PDF when author content actually changes', async () => {
    const article = { ...journalStore.articles[0], pdf_url: '/published.pdf', pdf_file_size: 123 };
    vi.mocked(getArticleById).mockResolvedValue(article);
    const authors = article.authors!.map(author => ({ ...author, affiliation: 'Updated Research Institute' }));
    const response = await PATCH(new NextRequest('http://localhost/api/admin/articles/test', { method: 'PATCH', body: JSON.stringify({ authors }) }), { params: Promise.resolve({ id: article.id }) });
    expect(response.status).toBe(200);
    expect(updateArticle).toHaveBeenCalledWith(article.id, expect.objectContaining({ status: 'draft', pdf_url: undefined, pdf_storage_path: undefined }));
  });
  it('drains existing pending messages even when no new notification was created', async () => {
    expect((await save()).status).toBe(200);
    const callback = vi.mocked(after).mock.calls[0][0] as () => Promise<void>;
    await callback();
    expect(drainNotificationQueue).toHaveBeenCalledWith(30, 30000);
  });
  it('shows an explicit configuration warning when email cannot be sent', async () => {
    vi.mocked(mailConfigured).mockReturnValue(false);
    const response = await save();
    expect(response.status).toBe(200);
    expect((await response.json()).notification_warning).toContain('Email xizmati sozlanmagan');
    expect(after).not.toHaveBeenCalled();
  });
});
