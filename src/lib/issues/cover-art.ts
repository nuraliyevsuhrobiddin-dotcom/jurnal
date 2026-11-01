import type { Issue, JournalSettings, Language } from '@/types/journal';

const xml = (value: string) => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]!));

const copyByLang: Record<Language, {
  eyebrow: string;
  subtitle: string;
  tagline: string;
  issueLine: (volume: number, issueNumber: number, year: number) => string;
}> = {
  uz: {
    eyebrow: 'ILMIY TADQIQOTLAR · TAHLIL · KASHFIYOTLAR',
    subtitle: 'Ko‘p tarmoqli xalqaro ilmiy elektron jurnal',
    tagline: 'Ilm-fan va amaliyot integratsiyasi.',
    issueLine: (v, n, y) => `JILD ${v} · SON ${n} · ${y}-YIL`,
  },
  ru: {
    eyebrow: 'НАУЧНЫЕ ИССЛЕДОВАНИЯ · АНАЛИЗ · ОТКРЫТИЯ',
    subtitle: 'Междисциплинарный международный научный журнал',
    tagline: 'Интеграция науки и практики.',
    issueLine: (v, n, y) => `ТОМ ${v} · ВЫПУСК ${n} · ${y}`,
  },
  en: {
    eyebrow: 'RESEARCH · SCHOLARSHIP · DISCOVERY',
    subtitle: 'Multidisciplinary international scientific journal',
    tagline: 'Ideas into knowledge.',
    issueLine: (v, n, y) => `VOLUME ${v} · ISSUE ${n} · ${y}`,
  },
};

/** Original vector artwork; the same rasterized cover is used on the site and in issue PDFs. */
export function issueCoverSvg(
  issue: Pick<Issue, 'volume' | 'issue_number' | 'year'>,
  settings: Pick<JournalSettings, 'journal_name' | 'publisher' | 'issn_online' | 'issn_print'>,
  lang: Language = 'uz'
) {
  const t = copyByLang[lang] || copyByLang.uz;
  const name = settings.journal_name.toUpperCase();
  const nameSize = Math.min(100, 960 / Math.max(name.length * .64, 1));
  const issn = settings.issn_online ? `ISSN (Online): ${xml(settings.issn_online)}` : (settings.issn_print ? `ISSN: ${xml(settings.issn_print)}` : '');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1697" viewBox="0 0 1200 1697">
  <rect width="1200" height="1697" fill="#102b3f"/>
  <path d="M0 515H1200V1260H0Z" fill="#173b4d"/>
  <g stroke="#83b6aa" fill="none" opacity=".5">
    <circle cx="815" cy="875" r="365"/><circle cx="815" cy="875" r="270"/><circle cx="815" cy="875" r="175"/>
    <path d="M0 1140L1200 580M0 1310L1200 750M0 970L1200 410M450 515V1260M815 515V1260"/>
  </g>
  <rect x="84" y="82" width="66" height="8" fill="#b8d6ca"/>
  <text x="84" y="160" font-family="sans-serif" font-size="19" letter-spacing="5" fill="#b8d6ca">${xml(t.eyebrow)}</text>
  <text x="80" y="310" font-family="sans-serif" font-weight="700" font-size="${nameSize}" fill="white">${xml(name)}</text>
  <text x="84" y="380" font-family="sans-serif" font-size="27" fill="#d1dfdf">${xml(t.subtitle)}</text>
  ${issn ? `<text x="84" y="420" font-family="sans-serif" font-size="18" letter-spacing="2" fill="#83b6aa">${issn}</text>` : ''}
  <rect x="84" y="575" width="225" height="58" fill="#b8d6ca"/>
  <text x="106" y="613" font-family="sans-serif" font-size="22" font-weight="700" fill="#102b3f">${issue.year} / ${String(issue.issue_number).padStart(2, '0')}</text>
  <text x="84" y="1177" font-family="serif" font-size="69" fill="white">${xml(t.tagline)}</text>
  <text x="84" y="1370" font-family="sans-serif" font-size="22" letter-spacing="4" fill="#b8d6ca">${xml(t.issueLine(issue.volume, issue.issue_number, issue.year))}</text>
  <path d="M84 1430H1116" stroke="#759b9b"/>
  <text x="84" y="1510" font-family="sans-serif" font-size="${Math.min(25, 1000 / Math.max((settings.publisher || settings.journal_name).length * .6, 1))}" fill="#e1e9e9">${xml(settings.publisher || settings.journal_name)}</text>
  <text x="84" y="1580" font-family="sans-serif" font-size="19" letter-spacing="3" fill="#a8c2c1">agmjoural.uz</text>
</svg>`;
}
