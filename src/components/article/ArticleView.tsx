'use client';
import { useEffect } from 'react';

export function ArticleView({ id }: { id: string }) {
  useEffect(() => {
    void fetch(`/api/articles/${id}/view`, { method: 'POST', keepalive: true }).catch(() => {});
  }, [id]);
  return null;
}
