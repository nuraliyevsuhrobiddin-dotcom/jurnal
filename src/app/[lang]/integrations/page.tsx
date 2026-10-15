import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { publicPageMetadata } from '@/lib/page-metadata';
import type { Language } from '@/types/journal';
import styles from './page.module.css';

const copy = {
  en: {
    eyebrow: 'Research infrastructure', title: 'Discovery & identifiers',
    intro: 'How our publications connect to scholarly search, persistent identifiers and researcher profiles.',
    note: 'Service logos identify the providers described below. They do not indicate membership, endorsement or confirmed indexing.',
    scope: 'Current capabilities', next: 'What comes next', docs: 'Official guidance', action: 'Visit provider',
    statuses: ['Metadata ready', 'Registration required', 'Not connected', 'Profile links supported'],
    descriptions: [
      'Article pages expose scholarly citation metadata and links to full-text PDFs for discovery.',
      'DOI links can be checked against the DOI resolver. A DOI field alone does not register a publication.',
      'Zenodo can preserve research outputs and assign a DOI to a published repository record.',
      'Authors can supply an ORCID iD linking to their public researcher profile.',
    ],
    steps: [
      'Google decides inclusion and crawl timing. Metadata readiness does not confirm that an article is indexed.',
      'Publisher registration credentials and a DOI prefix are required before deposits can be made.',
      'A repository account and authorized access token are required. No automatic deposits are currently enabled.',
      'Profile links are not authenticated through ORCID OAuth and do not confirm author identity.',
    ],
    footer: 'Read our indexing policy',
  },
  uz: {
    eyebrow: 'Ilmiy infratuzilma', title: 'Qidiruv va identifikatorlar',
    intro: 'Nashrlarimizning ilmiy qidiruv, doimiy identifikatorlar va tadqiqotchi profillari bilan aloqasi.',
    note: 'Logotiplar quyida tavsiflangan xizmatlarni bildiradi. Ular a’zolik, hamkorlik yoki tasdiqlangan indekslanishni anglatmaydi.',
    scope: 'Mavjud imkoniyatlar', next: 'Keyingi qadam', docs: 'Rasmiy qo‘llanma', action: 'Xizmatga o‘tish',
    statuses: ['Metama’lumot tayyor', 'Ro‘yxatdan o‘tish kerak', 'Ulanmagan', 'Profil havolalari mavjud'],
    descriptions: [
      'Maqola sahifalarida ilmiy iqtibos metama’lumotlari va to‘liq PDF havolalari mavjud.',
      'DOI havolalari DOI resolver orqali tekshiriladi. DOI maydonini to‘ldirish maqolani ro‘yxatdan o‘tkazmaydi.',
      'Zenodo tadqiqot materiallarini saqlashi va nashr etilgan repozitoriy yozuviga DOI berishi mumkin.',
      'Mualliflar ochiq tadqiqotchi profiliga olib boruvchi ORCID iD kiritishlari mumkin.',
    ],
    steps: [
      'Indekslash va tekshirish muddatini Google belgilaydi. Metama’lumot tayyorligi indekslanganlik tasdig‘i emas.',
      'Maqolalarni ro‘yxatdan o‘tkazishdan oldin nashriyot hisobi va DOI prefiksi kerak.',
      'Repozitoriy hisobi va ruxsat berilgan token kerak. Avtomatik yuborish hozir yoqilmagan.',
      'Profil havolalari ORCID OAuth orqali tasdiqlanmagan va muallif shaxsini tasdiqlamaydi.',
    ],
    footer: 'Indekslash siyosatini o‘qish',
  },
  ru: {
    eyebrow: 'Научная инфраструктура', title: 'Поиск и идентификаторы',
    intro: 'Как публикации связаны с научным поиском, постоянными идентификаторами и профилями исследователей.',
    note: 'Логотипы обозначают описанные сервисы. Они не подтверждают членство, партнёрство или индексацию.',
    scope: 'Текущие возможности', next: 'Следующий шаг', docs: 'Официальное руководство', action: 'Перейти к сервису',
    statuses: ['Метаданные готовы', 'Нужна регистрация', 'Не подключено', 'Ссылки на профили'],
    descriptions: [
      'Страницы статей содержат научные метаданные для цитирования и ссылки на полные PDF.',
      'Ссылки DOI можно проверить через резолвер DOI. Заполнение поля DOI не регистрирует публикацию.',
      'Zenodo позволяет сохранять результаты исследований и присваивать DOI опубликованной записи.',
      'Авторы могут указать ORCID iD со ссылкой на открытый профиль исследователя.',
    ],
    steps: [
      'Решение об индексации и сроках обхода принимает Google. Готовность метаданных не подтверждает индексацию.',
      'Для регистрации публикаций нужны учётные данные издателя и префикс DOI.',
      'Нужны учётная запись репозитория и авторизованный токен. Автоматическая отправка пока не включена.',
      'Ссылки не аутентифицированы через ORCID OAuth и не подтверждают личность автора.',
    ],
    footer: 'Политика индексации',
  },
};

const providers = [
  { name: 'Google Scholar', category: 'Discovery', url: 'https://scholar.google.com/', docs: 'https://scholar.google.com/intl/en/scholar/inclusion.html' },
  { name: 'Crossref', category: 'Persistent identifiers', logo: '/brands/crossref.svg', width: 152, height: 52, url: 'https://www.crossref.org/membership/', docs: 'https://www.crossref.org/documentation/register-maintain-records/' },
  { name: 'Zenodo', category: 'Research repository', logo: '/brands/zenodo.png', width: 145, height: 44, url: 'https://zenodo.org/signup/', docs: 'https://about.zenodo.org/' },
  { name: 'ORCID', category: 'Researcher identity', logo: '/brands/orcid.png', width: 48, height: 48, url: 'https://orcid.org/register', docs: 'https://info.orcid.org/documentation/integration-guide/' },
];

function language(value: string): Language { return value === 'uz' || value === 'ru' ? value : 'en'; }

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const lang = language((await params).lang);
  return publicPageMetadata(lang, '/integrations', copy[lang].title, copy[lang].intro);
}

export default async function IntegrationsPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = language((await params).lang);
  const text = copy[lang];
  return <div className={styles.page}>
    <header className={styles.hero}><div className="journal-container">
      <p className={styles.eyebrow}>{text.eyebrow}</p>
      <h1>{text.title}</h1><p className={styles.intro}>{text.intro}</p>
    </div></header>
    <div className={`journal-container ${styles.content}`}>
      <p className={styles.note}>{text.note}</p>
      <div className={styles.providers}>{providers.map((provider, index) => <section key={provider.name} className={styles.provider} aria-labelledby={`provider-${index}`}>
        <div className={styles.identity}><span className={styles.number}>0{index + 1}</span>
          <h2 id={`provider-${index}`} className={styles.brand}>{provider.logo ? <><Image unoptimized src={provider.logo} alt={provider.name} width={provider.width} height={provider.height} style={{ width: provider.width, height: provider.height, flex: 'none' }} />{provider.name === 'ORCID' && <span>ORCID</span>}</> : provider.name}</h2>
          <span className={styles.status}>{text.statuses[index]}</span>
        </div>
        <div className={styles.detail}><h3>{text.scope}</h3><p>{text.descriptions[index]}</p><h3>{text.next}</h3><p>{text.steps[index]}</p>
          <div className={styles.links}><a href={provider.url} aria-label={`${provider.name}: ${text.action}`} target="_blank" rel="noopener noreferrer">{text.action}<ArrowUpRight size={14} aria-hidden="true" /></a><a href={provider.docs} aria-label={`${provider.name}: ${text.docs}`} target="_blank" rel="noopener noreferrer">{text.docs}<ArrowUpRight size={14} aria-hidden="true" /></a></div>
        </div>
      </section>)}</div>
      <Link className={styles.policy} href={`/${lang}/indexing`}>{text.footer}<ArrowUpRight size={16} aria-hidden="true" /></Link>
    </div>
  </div>;
}
