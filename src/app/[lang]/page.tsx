import { IssueCoverImage } from '@/components/issues/IssueCoverImage';
import { collectionVisibilityMessage } from '@/lib/issues/collection-policy';
import Link from 'next/link';
import { ArrowUpRight, Search, ArrowRight, BookOpen } from 'lucide-react';
import { Language } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getCatalogArticles, getCurrentIssue } from '@/lib/db';
import { ArticleCard } from '@/components/article/ArticleCard';
import './catalog.css';
import { subjectCollections, subjectLabel } from '@/lib/subjects';
import { SubjectCover } from '@/components/subjects/SubjectCover';
import { publicPageMetadata } from '@/lib/page-metadata';
import { IntegrationLogos } from '@/components/home/IntegrationLogos';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const language = (['en', 'uz', 'ru'].includes(lang) ? lang : 'en') as Language;
  const titles = { uz: 'AGM Journal — Xalqaro ilmiy jurnal', en: 'AGM Journal — International Scientific Journal', ru: 'AGM Journal — Международный научный журнал' };
  const descriptions = { uz: 'Ochiq kirishdagi ko‘p tarmoqli ilmiy tadqiqotlar. Nashr etilgan maqolalar, jurnal sonlari, mualliflar uchun talablar va tahririyat siyosati.', en: 'Open-access multidisciplinary research. Browse published articles, journal issues, author guidelines and editorial policies.', ru: 'Междисциплинарные научные исследования открытого доступа. Опубликованные статьи, выпуски журнала, требования к авторам и редакционная политика.' };
  return publicPageMetadata(language, '', titles[language], descriptions[language]);
}

const copy = {
  uz: {
    eyebrow: 'AGM JOURNAL · ILMIY NASHRLAR', title: 'Ilmiy nashrlar katalogi', intro: 'Maqolalar, fan yo‘nalishlari va jurnal sonlari — yagona katalogda.',
    browse: 'Fan yo‘nalishlari', collections: 'AGM Journal mavzuli to‘plamlari', section: 'Mavzuli to‘plam', explore: 'Maqolalarni ko‘rish',
    latest: 'So‘nggi maqolalar', all: 'Barcha maqolalar', current: 'Joriy son', archive: 'Sonlar arxivi', empty: 'Nashr etilgan maqolalar hali mavjud emas.',
    author: 'Mualliflar uchun', guidelines: 'Maqola tayyorlash talablari', review: 'Taqriz jarayoni', policies: 'Nashr siyosatlari',
    noIssue: 'Joriy son hali e’lon qilinmagan.', scope: 'Ko‘p tarmoqli ilmiy jurnal',
    editionLabel: (v: number, n: number) => `JILD ${v} / SON ${n}`,
    labels: ['Tabiiy fanlar', 'Muhandislik va texnologiya', 'Tibbiyot va hayot fanlari', 'Iqtisodiyot va biznes', 'Ijtimoiy fanlar', 'Ta’lim va gumanitar fanlar', 'Ko‘p tarmoqli tadqiqotlar'],
    descriptions: ['Fizika, kimyo, matematika va atrof-muhit tadqiqotlari.', 'Hisoblash texnikasi, muhandislik va amaliy innovatsiyalar.', 'Biologiya, salomatlik va tibbiyot tadqiqotlari.', 'Iqtisodiy rivojlanish, moliya va boshqaruv.', 'Jamiyat, huquq va ijtimoiy jarayonlar.', 'Pedagogika, tilshunoslik, tarix va madaniyat.', 'Fanlararo va yangi ilmiy sohalardagi tadqiqotlar.'],
  },
  en: {
    eyebrow: 'AGM JOURNAL · RESEARCH PUBLICATIONS', title: 'Research publications', intro: 'Articles, subject collections and journal issues in one catalog.',
    browse: 'Browse by discipline', collections: 'Subject collections within AGM Journal', section: 'Subject collection', explore: 'Explore articles',
    latest: 'Latest research', all: 'All articles', current: 'Current issue', archive: 'Issue archive', empty: 'No published articles are available yet.',
    author: 'For authors', guidelines: 'Submission guidelines', review: 'Peer review process', policies: 'Publishing policies',
    noIssue: 'The current issue has not been announced yet.', scope: 'Multidisciplinary research journal',
    editionLabel: (v: number, n: number) => `VOL. ${v} / NO. ${n}`,
    labels: ['Natural sciences', 'Engineering & technology', 'Medicine & life sciences', 'Economics & business', 'Social sciences', 'Education & humanities', 'Multidisciplinary research'],
    descriptions: ['Physics, chemistry, mathematics and environmental research.', 'Computing, engineering and applied innovation.', 'Biology, health and medical research.', 'Economic development, finance and management.', 'Society, law and social processes.', 'Education, linguistics, history and culture.', 'Multidisciplinary and emerging field research.'],
  },
  ru: {
    eyebrow: 'AGM JOURNAL · НАУЧНЫЕ ПУБЛИКАЦИИ', title: 'Каталог научных публикаций', intro: 'Статьи, тематические коллекции и выпуски журнала — в едином каталоге.',
    browse: 'По научным направлениям', collections: 'Тематические коллекции AGM Journal', section: 'Тематическая коллекция', explore: 'Просмотреть статьи',
    latest: 'Последние публикации', all: 'Все статьи', current: 'Текущий выпуск', archive: 'Архив выпусков', empty: 'Опубликованных статей пока нет.',
    author: 'Авторам', guidelines: 'Требования к рукописям', review: 'Процедура рецензирования', policies: 'Редакционная политика',
    noIssue: 'Текущий выпуск ещё не опубликован.', scope: 'Мультидисциплинарный научный журнал',
    editionLabel: (v: number, n: number) => `ТОМ ${v} / ВЫПУСК ${n}`,
    labels: ['Естественные науки', 'Инженерия и технологии', 'Медицина и биология', 'Экономика и бизнес', 'Социальные науки', 'Образование и гуманитарные науки', 'Междисциплинарные исследования'],
    descriptions: ['Физика, химия, математика и исследования окружающей среды.', 'Вычислительная техника, инженерия и прикладные инновации.', 'Биология, здоровье и медицинские исследования.', 'Экономическое развитие, финансы и управление.', 'Общество, право и социальные процессы.', 'Образование, языкознание, история и культура.', 'Исследования на стыке научных дисциплин.'],
  },
};

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const currentLang = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const t = copy[currentLang];
  const dict = getDictionary(currentLang);
  const [articles, issue] = await Promise.all([getCatalogArticles({ limit: 4 }), getCurrentIssue()]);

  return <div className="research-catalog">
    <section className="catalog-intro"><div className="journal-container catalog-intro-grid">
      <div>
        <p className="catalog-eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="catalog-intro-text">{t.intro}</p>
        <form action={`/${currentLang}/articles`} method="GET" className="catalog-search">
          <Search size={20} aria-hidden="true" />
          <input name="q" aria-label={dict.hero.searchPlaceholder} placeholder={dict.hero.searchPlaceholder} />
          <button type="submit">{dict.hero.searchButton}<ArrowRight size={17} /></button>
        </form>
      </div>
      <aside className="catalog-issue">
        <span className="catalog-eyebrow">{t.current}</span>
        {issue ? (
          <>
            <Link className="catalog-current-cover" href={`/${currentLang}/current`} aria-label={t.current}>
              <IssueCoverImage src={issue.cover_image_url} alt={`${issue[`title_${currentLang}`] || issue.title_uz || t.current} cover`} className="object-contain" />
            </Link>
            <div className="catalog-issue-number">{issue.year}<span>{t.editionLabel(issue.volume, issue.issue_number)}</span></div>
            <p>{issue[`title_${currentLang}`] || issue.title_uz || t.scope}</p>
            <Link href={`/${currentLang}/current`}>{dict.sections.exploreIssue}<ArrowUpRight size={16} /></Link>
          </>
        ) : <p>{t.noIssue}</p>}
        <Link className="catalog-archive-link" href={`/${currentLang}/archive`}>{t.archive}<ArrowRight size={15} /></Link>
      </aside>
    </div></section>
    <section className="journal-container catalog-subjects" aria-labelledby="subjects-title">
      <div className="catalog-section-heading">
        <div><p className="catalog-eyebrow">{t.collections}</p><h2 id="subjects-title">{t.browse}</h2></div>
        <span className="catalog-section-index">01 — 07</span>
      </div>
      <div className="catalog-subject-grid">
        {subjectCollections.map((subject, i) => (
          <article className="catalog-subject" key={subject.id}>
            <Link className="catalog-numbered-cover" href={`/${currentLang}/subjects/${subject.id}${issue ? `?issue=${issue.id}` : ''}`} aria-label={`${subjectLabel(subject.id, currentLang)} — ${t.explore}`}>
              <SubjectCover subjectId={subject.id} issueId={issue?.id} alt={`AGM Journal — ${subjectLabel(subject.id, currentLang)}`} lang={currentLang} />
              {issue && <span className="catalog-cover-edition"><strong>{t.editionLabel(issue.volume, issue.issue_number)}</strong><span>{issue.year}</span></span>}
            </Link>
            <div className="subject-info">
              <span>{t.section} / {String(i + 1).padStart(2, '0')}</span>
              <h3><Link href={`/${currentLang}/subjects/${subject.id}`}>{subjectLabel(subject.id, currentLang)}</Link></h3>
              <p>{t.descriptions[i]}</p>
              <Link className="catalog-text-link" href={`/${currentLang}/subjects/${subject.id}`}>{t.explore}<ArrowUpRight size={15} /></Link>
            </div>
          </article>
        ))}
      </div>
    </section>
    <section className="catalog-publications">
      <div className="journal-container">
        <div className="catalog-section-heading">
          <div><p className="catalog-eyebrow">AGM JOURNAL</p><h2>{t.latest}</h2></div>
          <Link className="catalog-text-link" href={`/${currentLang}/articles`}>{t.all}<ArrowRight size={16} /></Link>
        </div>
        {articles.length ? (
          <div className="catalog-article-grid">
            {articles.map(article => <ArticleCard key={article.id} article={article} lang={currentLang} />)}
          </div>
        ) : (
          <div className="catalog-empty"><BookOpen size={25} /><p>{collectionVisibilityMessage(currentLang)}</p></div>
        )}
      </div>
    </section>
    <IntegrationLogos lang={currentLang} />
    <section className="journal-container catalog-author">
      <h2>{t.author}</h2>
      {[['guidelines', t.guidelines], ['peer-review', t.review], ['policies', t.policies]].map(([path, label]) => (
        <Link key={path} href={`/${currentLang}/${path}`}>{label}<ArrowUpRight size={17} /></Link>
      ))}
    </section>
  </div>;
}
