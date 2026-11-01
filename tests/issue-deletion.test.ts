import { beforeEach, describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { deleteIssue } from '@/lib/db';
import { journalStore } from '@/lib/data-store';
import { DELETE } from '@/app/api/admin/issues/[id]/route';
import { PublicationError } from '@/lib/publication-ready';
import { createServerClient } from '@/lib/supabase/server';

vi.mock('@/lib/admin-access', () => ({ adminAccess: async () => null }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn(() => null), isServerSupabaseConfigured: true }));

beforeEach(() => vi.mocked(createServerClient).mockReturnValue(null));

describe('Issue deletion safety', () => {
  it('preserves a local issue with linked articles', async () => {
    const id = journalStore.articles[0].issue_id!;
    await expect(deleteIssue(id)).rejects.toBeInstanceOf(PublicationError);
    expect(journalStore.issues.some(issue => issue.id === id)).toBe(true);
    const response = await DELETE(new NextRequest(`http://localhost/api/admin/issues/${id}`, { method: 'DELETE' }), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(409);
  });
  it('checks hosted assignments before deleting', async () => {
    const remove = vi.fn();
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'linked' }, error: null });
    vi.mocked(createServerClient).mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ limit: () => ({ maybeSingle }) }) }), delete: remove }) } as unknown as NonNullable<ReturnType<typeof createServerClient>>);
    await expect(deleteIssue('issue')).rejects.toBeInstanceOf(PublicationError);
    expect(remove).not.toHaveBeenCalled();
  });
  it.each(['23503', '23001'])('reports a concurrent hosted assignment as a conflict (%s)', async code => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockResolvedValue({ data: null, error: { code } });
    vi.mocked(createServerClient).mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ limit: () => ({ maybeSingle }) }) }), delete: () => ({ eq: () => ({ select }) }) }) } as unknown as NonNullable<ReturnType<typeof createServerClient>>);
    const response = await DELETE(new NextRequest('http://localhost/api/admin/issues/issue', { method: 'DELETE' }), { params: Promise.resolve({ id: 'issue' }) });
    expect(response.status).toBe(409);
  });
});
