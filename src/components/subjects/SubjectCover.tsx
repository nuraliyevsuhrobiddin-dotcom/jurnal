import Image from 'next/image';
import styles from './subjects.module.css';

export function SubjectCover({ subjectId, issueId, alt, priority = false }: { subjectId: string; issueId?: string; alt: string; priority?: boolean }) {
  return <Image className={styles.cover} src={`/api/subjects/${subjectId}/cover${issueId ? `?issue=${issueId}` : ''}`} alt={alt} width={1200} height={1697} unoptimized priority={priority} />;
}
