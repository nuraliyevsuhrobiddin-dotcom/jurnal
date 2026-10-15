import type { Issue, JournalSettings } from '@/types/journal';

const xml = (value: string) => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]!));

/** Original vector artwork; the same rasterized cover is used on the site and in issue PDFs. */
export function issueCoverSvg(issue: Pick<Issue, 'volume' | 'issue_number' | 'year'>, settings: Pick<JournalSettings, 'journal_name' | 'publisher'>) {
  const name = settings.journal_name.toUpperCase();
  const nameSize = Math.min(100, 960 / Math.max(name.length * .64, 1));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1697" viewBox="0 0 1200 1697">
  <rect width="1200" height="1697" fill="#102b3f"/>
  <path d="M0 515H1200V1260H0Z" fill="#173b4d"/>
  <g stroke="#83b6aa" fill="none" opacity=".5">
    <circle cx="815" cy="875" r="365"/><circle cx="815" cy="875" r="270"/><circle cx="815" cy="875" r="175"/>
    <path d="M0 1140L1200 580M0 1310L1200 750M0 970L1200 410M450 515V1260M815 515V1260"/>
  </g>
  <rect x="84" y="82" width="66" height="8" fill="#b8d6ca"/>
  <text x="84" y="160" font-family="sans-serif" font-size="19" letter-spacing="5" fill="#b8d6ca">RESEARCH · SCHOLARSHIP · DISCOVERY</text>
  <text x="80" y="310" font-family="sans-serif" font-weight="700" font-size="${nameSize}" fill="white">${xml(name)}</text>
  <text x="84" y="390" font-family="sans-serif" font-size="27" fill="#d1dfdf">Multidisciplinary scientific journal</text>
  <rect x="84" y="575" width="225" height="58" fill="#b8d6ca"/>
  <text x="106" y="613" font-family="sans-serif" font-size="22" font-weight="700" fill="#102b3f">${issue.year} / ${String(issue.issue_number).padStart(2, '0')}</text>
  <text x="84" y="1177" font-family="serif" font-size="69" fill="white">Ideas into knowledge.</text>
  <text x="84" y="1370" font-family="sans-serif" font-size="22" letter-spacing="4" fill="#b8d6ca">VOLUME ${issue.volume} · ISSUE ${issue.issue_number} · ${issue.year}</text>
  <path d="M84 1430H1116" stroke="#759b9b"/>
  <text x="84" y="1510" font-family="sans-serif" font-size="${Math.min(25, 1000 / Math.max(settings.publisher.length * .6, 1))}" fill="#e1e9e9">${xml(settings.publisher)}</text>
  <text x="84" y="1580" font-family="sans-serif" font-size="19" letter-spacing="3" fill="#a8c2c1">agmjoural.uz</text>
  </svg>`;
}
