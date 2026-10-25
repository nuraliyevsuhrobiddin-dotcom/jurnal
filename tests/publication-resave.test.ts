import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, after } from 'next/server';
import { PATCH } from '@/app/api/admin/articles/[id]/route';
import { drainNotificationQueue, mailConfigured } from '@/lib/notifications';
import { journalStore } from '@/lib/data-store';

vi.mock('next/server', async original => ({ ...await original<typeof import('next/server')>(), after: vi.fn() }));
vi.mock('@/lib/admin-access', () => ({ adminAccess: async () => null }));
vi.mock('@/lib/db', () => ({
  getArticleById: async () => journalStore.articles[0],
  updateArticle: async () => journalStore.articles[0],
}));
vi.mock('@/lib/publication-notifications', () => ({ queueArticleNotifications: async () => [] }));
vi.mock('@/lib/notifications', () => ({ mailConfigured: vi.fn(() => true), drainNotificationQueue: vi.fn() }));

beforeEach(() => { vi.clearAllMocks(); vi.mocked(mailConfigured).mockReturnValue(true); });
const save = () => PATCH(new NextRequest('http://localhost/api/admin/articles/test', { method: 'PATCH', body: '{}' }), { params: Promise.resolve({ id: journalStore.articles[0].id }) });

describe('Article save email recovery', () => {
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
