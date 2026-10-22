import { notFound } from 'next/navigation';
import { getArticleById } from '@/lib/db';
import { ArticleEditor } from '@/components/admin/ArticleEditor';
import { EditorialCorrespondence } from '@/components/admin/EditorialCorrespondence';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const article = await getArticleById(id);
 if (!article) notFound();
 return <><ArticleEditor initialArticle={article} /><EditorialCorrespondence articleId={article.id} /></>;
}
