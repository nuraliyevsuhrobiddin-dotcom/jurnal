import Image from 'next/image';
import type { Language } from '@/types/journal';
import styles from './subjects.module.css';

export function SubjectCover({
  subjectId,
  issueId,
  alt,
  priority = false,
  lang,
}: {
  subjectId: string;
  issueId?: string;
  alt: string;
  priority?: boolean;
  lang?: Language;
}) {
  const langParam = lang ? `&lang=${lang}` : '';
  const issueParam = issueId ? `&issue=${issueId}` : '';
  return (
    <Image
      className={styles.cover}
      src={`/api/subjects/${subjectId}/cover?v=3${langParam}${issueParam}`}
      alt={alt}
      width={1200}
      height={1697}
      unoptimized
      priority={priority}
    />
  );
}
