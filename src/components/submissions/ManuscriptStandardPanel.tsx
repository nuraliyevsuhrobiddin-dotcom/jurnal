import Link from 'next/link';
import { ArrowDownToLine, ArrowUpRight } from 'lucide-react';
import type { Language } from '@/types/journal';
import { manuscriptStandard } from '@/lib/manuscript-standard';
import styles from './ManuscriptStandardPanel.module.css';

const copy = {
  uz: {
    eyebrow: 'AGM JOURNAL / MUALLIF STANDARTI', title: 'Bitta shablon. Aniq ilmiy tuzilish.',
    lead: 'Maqolangizni jurnalning yagona Word shablonida tayyorlang. Bir xil tartib — o‘zbek, rus va ingliz tillarida.',
    download: 'Word shablonini yuklab olish', caption: 'Birinchi sahifa tuzilishi · namuna', paper: 'QO‘LYOZMA SHABLONI',
    article: 'Maqolangizning aniq va mazmunli sarlavhasi', author: 'Muallifning to‘liq ismi', affiliation: 'Tashkilot, mamlakat · mas’ul muallif emaili',
    abstract: 'Annotatsiya', abstractText: 'Tadqiqot savoli, usullar, asosiy natijalar va ilmiy ahamiyatini qisqacha bayon qiling.',
    keywords: 'Kalit so‘zlar', keywordText: 'Mavzu, usul va asosiy tushunchalar', introduction: '1. Kirish', introText: 'Muammo, mavjud bilimlardagi bo‘shliq va tadqiqot maqsadini tushuntiring.',
    format: 'Sahifa formati', typography: 'Shrift', spacing: 'Qator oralig‘i', margins: 'Hoshiyalar', indent: 'Birinchi qator', pagination: 'Sahifalar', pageNumber: 'Raqamlangan',
    structure: 'Maqola tarkibi', body: 'Kirish → metodlar → natijalar → muhokama → xulosa',
    structureNote: 'So‘ng deklaratsiyalar va adabiyotlar. Sharh, nazariy ish va holat tavsifida asosiy bo‘limlar tadqiqot turiga moslashtiriladi.',
    declarations: 'Ilmiy shaffoflik', disclosures: 'Mualliflar hissasi · moliyalashtirish · manfaatlar to‘qnashuvi · ma’lumotlar mavjudligi · etika va rozilik · generativ SI yordami.',
    language: 'Asosiy matn uch tildan birida qabul qilinadi. Xalqaro topish imkoniyati uchun inglizcha sarlavha va annotatsiya nashrdan oldin tahririyat bilan tayyorlanib tekshiriladi.',
    file: 'PDF yoki DOCX · 4 MB gacha', note: 'Formatni tahririyat tekshiradi. Shablonni to‘ldirish nashrga qabul qilinishini kafolatlamaydi.',
    submit: 'Maqola yuborish', charter: 'Jurnal nizomi', ethics: 'Nashr etikasi',
  },
  en: {
    eyebrow: 'AGM JOURNAL / AUTHOR STANDARD', title: 'One template. A clear scholarly structure.',
    lead: 'Prepare your manuscript using the journal’s Word template. One consistent structure in Uzbek, Russian and English.',
    download: 'Download the Word template', caption: 'First-page structure · sample', paper: 'MANUSCRIPT TEMPLATE',
    article: 'Your precise and informative article title', author: 'Author’s full name', affiliation: 'Institution, country · corresponding author’s email',
    abstract: 'Abstract', abstractText: 'Summarise the research question, methods, principal findings and scholarly contribution.',
    keywords: 'Keywords', keywordText: 'Topic, method and key concepts', introduction: '1. Introduction', introText: 'Explain the problem, the gap in existing knowledge and the purpose of the study.',
    format: 'Page format', typography: 'Typeface', spacing: 'Line spacing', margins: 'Margins', indent: 'First-line indent', pagination: 'Pages', pageNumber: 'Numbered',
    structure: 'Article structure', body: 'Introduction → methods → results → discussion → conclusion',
    structureNote: 'Follow with declarations and references. Adapt the body sections to reviews, theoretical work and case studies.',
    declarations: 'Research transparency', disclosures: 'Author contributions · funding · competing interests · data availability · ethics and consent · generative AI assistance.',
    language: 'The full text may be in any of the three languages. An English title and abstract are prepared and checked with the editors before publication for international discoverability.',
    file: 'PDF or DOCX · up to 4 MB', note: 'Editors check the format. Completing the template does not guarantee acceptance for publication.',
    submit: 'Submit a manuscript', charter: 'Journal charter', ethics: 'Publication ethics',
  },
  ru: {
    eyebrow: 'AGM JOURNAL / СТАНДАРТ ДЛЯ АВТОРОВ', title: 'Единый шаблон. Ясная научная структура.',
    lead: 'Подготовьте рукопись по единому шаблону Word журнала. Одинаковая структура на узбекском, русском и английском языках.',
    download: 'Скачать шаблон Word', caption: 'Структура первой страницы · образец', paper: 'ШАБЛОН РУКОПИСИ',
    article: 'Точное и содержательное название вашей статьи', author: 'Полное имя автора', affiliation: 'Организация, страна · email ответственного автора',
    abstract: 'Аннотация', abstractText: 'Кратко опишите исследовательский вопрос, методы, основные результаты и научный вклад.',
    keywords: 'Ключевые слова', keywordText: 'Тема, метод и основные понятия', introduction: '1. Введение', introText: 'Объясните проблему, пробел в существующих знаниях и цель исследования.',
    format: 'Формат страницы', typography: 'Шрифт', spacing: 'Межстрочный интервал', margins: 'Поля', indent: 'Абзацный отступ', pagination: 'Страницы', pageNumber: 'Пронумерованы',
    structure: 'Структура статьи', body: 'Введение → методы → результаты → обсуждение → заключение',
    structureNote: 'Затем декларации и литература. Основные разделы адаптируются к обзорам, теоретическим работам и описаниям случаев.',
    declarations: 'Прозрачность исследования', disclosures: 'Вклад авторов · финансирование · конфликт интересов · доступность данных · этика и согласие · помощь генеративного ИИ.',
    language: 'Основной текст принимается на одном из трёх языков. Английское название и аннотация готовятся и проверяются с редакцией до публикации для международной доступности.',
    file: 'PDF или DOCX · до 4 МБ', note: 'Редакция проверяет оформление. Заполнение шаблона не гарантирует принятия к публикации.',
    submit: 'Отправить рукопись', charter: 'Устав журнала', ethics: 'Публикационная этика',
  },
} satisfies Record<Language, Record<string, string>>;

export function ManuscriptStandardPanel({ lang }: { lang: Language }) {
  const t = copy[lang];
  const specifications = [
    [t.format, 'A4'], [t.typography, `${manuscriptStandard.font} · ${manuscriptStandard.fontSize} pt`],
    [t.spacing, String(manuscriptStandard.lineSpacing)], [t.margins, `${manuscriptStandard.marginMm} mm`], [t.indent, `${manuscriptStandard.firstLineMm} mm`], [t.pagination, t.pageNumber],
  ];

  return <section className={styles.panel} aria-labelledby={`manuscript-standard-${lang}`}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>{t.eyebrow}</p>
      <h2 id={`manuscript-standard-${lang}`}>{t.title}</h2>
      <p className={styles.lead}>{t.lead}</p>
      <a className={styles.download} href={`/api/submissions/template?lang=${lang}`} download>
        <ArrowDownToLine size={17} aria-hidden="true" />{t.download}
      </a>
      <span className={styles.file}>{t.file}</span>
    </header>
    <div className={styles.spread}>
      <figure className={styles.figure}>
        <div className={styles.paper}>
          <div className={styles.masthead}><strong>AGM <span>JOURNAL</span></strong><span>{t.paper}</span></div>
          <h3>{t.article}</h3><p className={styles.author}>{t.author}</p><p className={styles.affiliation}>{t.affiliation}</p>
          <div className={styles.abstract}><h4>{t.abstract}</h4><p>{t.abstractText}</p><p className={styles.keywords}><strong>{t.keywords}:</strong> {t.keywordText}</p></div>
          <h4 className={styles.introduction}>{t.introduction}</h4><p className={styles.introText}>{t.introText}</p>
          <div className={styles.paperFooter}><span>AGM JOURNAL</span><span>1</span></div>
        </div>
        <figcaption>{t.caption}</figcaption>
      </figure>
      <div className={styles.requirements}>
        <dl className={styles.specifications}>{specifications.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className={styles.detail}><span className={styles.number}>01</span><div><h3>{t.structure}</h3><p className={styles.bodyOrder}>{t.body}</p><p>{t.structureNote}</p></div></div>
        <div className={styles.detail}><span className={styles.number}>02</span><div><h3>{t.declarations}</h3><p>{t.disclosures}</p></div></div>
      </div>
    </div>
    <div className={styles.editorial}><p>{t.language}</p><p className={styles.note}>{t.note}</p></div>
    <nav className={styles.links} aria-label={t.eyebrow}>
      <Link href={`/${lang}/submit`}>{t.submit}<ArrowUpRight size={15} aria-hidden="true" /></Link>
      <Link href={`/${lang}/journal-charter`}>{t.charter}</Link><Link href={`/${lang}/ethics`}>{t.ethics}</Link>
    </nav>
  </section>;
}
