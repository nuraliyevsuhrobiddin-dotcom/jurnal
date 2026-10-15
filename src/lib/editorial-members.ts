import type { EditorialBoardMember } from '@/types/journal';

// Collapse identical records only. A person may legitimately have several roles
// or affiliations; differing records remain visible and are never deleted.
export function distinctEditorialMembers(members: EditorialBoardMember[]) {
  const seen = new Set<string>();
  return members.filter(member => {
    const ignored = new Set(['id', 'created_at', 'updated_at', 'order_index']);
    const key = JSON.stringify(Object.keys(member).filter(key => !ignored.has(key)).sort().map(key => [key, member[key as keyof EditorialBoardMember] ?? null]));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
