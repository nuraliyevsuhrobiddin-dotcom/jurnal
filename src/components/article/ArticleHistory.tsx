import { getArticleVersions } from '@/lib/article-versions';
import type { Article, Language } from '@/types/journal';

export async function ArticleHistory({ article, lang = 'uz', admin = false }: { article: Article; lang?: Language; admin?: boolean }) {
  const versions = (await getArticleVersions(article.id)).filter(version => admin || version.snapshot.status === 'published');
  if (!versions.length && !admin) return null;
  const title = lang === 'en' ? 'Versions and corrections' : lang === 'ru' ? 'Версии и исправления' : 'Versiyalar va tuzatishlar';
  return <section id="publication-history" className="my-8 rounded-xl border border-slate-200 bg-white p-5 space-y-4"><h2 className="text-lg font-semibold text-navy-900">{title}</h2><p className="text-sm">{lang === 'en' ? 'Current version' : lang === 'ru' ? 'Текущая версия' : 'Joriy versiya'}: {article.revision || 1} · <time dateTime={article.updated_at}>{new Date(article.updated_at).toISOString().slice(0, 10)}</time></p>{article.change_note && <p className="text-sm">{article.change_note}</p>}<ol className="space-y-3 text-sm">{versions.map(version => <li key={version.id} className="border-t border-slate-100 pt-3"><strong>v{version.revision}</strong> · <time dateTime={version.created_at}>{new Date(version.created_at).toISOString().slice(0, 10)}</time><p>{version.change_note}</p>{admin && version.pdf_storage_path && <a className="text-teal-800 underline" href={`/api/admin/articles/${article.id}/versions/${version.id}/pdf`}>Oldingi PDF nusxasini yuklash</a>}</li>)}</ol>{admin && !versions.length && <p className="text-sm text-slate-500">Hozircha oldingi versiyalar yo‘q.</p>}{versions.length === 100 && <p className="text-sm">Oxirgi 100 ta versiya ko‘rsatilmoqda.</p>}</section>;
}
