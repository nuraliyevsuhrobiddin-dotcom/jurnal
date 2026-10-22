import { createServerClient } from './supabase/server';
import { staffAuthClient, staffIdentity } from './staff-auth';

export async function reviewerIdentity() {
  const identity = await staffIdentity(await staffAuthClient());
  return identity?.mfa ? identity : null;
}

export async function assignedReview(id: string, reviewerId: string) {
  const db = createServerClient();
  if (!db) throw new Error('Supabase kerak.');
  const { data, error } = await db.from('review_assignments').select('*').eq('id', id).eq('reviewer_id', reviewerId).neq('status', 'cancelled').maybeSingle();
  if (error) throw new Error('Taqriz topshirig‘i olinmadi.');
  return data;
}
