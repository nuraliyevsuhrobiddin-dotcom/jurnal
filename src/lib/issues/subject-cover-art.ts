import type { Issue, JournalSettings } from '@/types/journal';
import { findSubject } from '@/lib/subjects';

const escapeXml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
const palettes: Record<string, [string, string]> = {
  'natural-sciences': ['#123e40', '#77c8b8'], 'engineering-technology': ['#172e47', '#82afca'],
  'medicine-life-sciences': ['#29483e', '#afd1ad'], 'economics-business': ['#552c37', '#daa993'],
  'social-sciences': ['#343d65', '#abb8ec'], 'education-humanities': ['#665020', '#e3cb86'],
  multidisciplinary: ['#172e40', '#adc9c9'],
};

export function subjectCoverSvg(subjectId: string, issue: Issue | undefined, settings: Pick<JournalSettings, 'journal_name' | 'publisher'>): string {
  const subject = findSubject(subjectId);
  const [background, accent] = palettes[subjectId] || palettes.multidisciplinary;
  const title = subject?.labels.en || 'Multidisciplinary research';
  const titleLines = title.includes(' & ') ? title.split(' & ').map((line, index) => `${index ? '& ' : ''}${line}`) : title.split(' ').reduce<string[]>((lines, word) => {
    const last = lines.length - 1;
    if (last < 0 || `${lines[last]} ${word}`.length > 21) lines.push(word); else lines[last] += ` ${word}`;
    return lines;
  }, []);
  let art = '';
  if (subjectId === 'natural-sciences') art = [0, 35, 70, 105].map(angle => `<ellipse cx="745" cy="1010" rx="380" ry="160" transform="rotate(${angle} 745 1010)"/>`).join('') + '<circle cx="745" cy="1010" r="24" fill="currentColor"/>';
  else if (subjectId === 'engineering-technology') art = Array.from({ length: 8 }, (_, i) => `<path d="M${200 + i * 130} 700V1290M180 ${720 + i * 80}H1100"/>`).join('') + '<path d="M230 1190L430 990L620 1100L850 830L1090 930" stroke-width="12"/>';
  else if (subjectId === 'medicine-life-sciences') art = [[390, 950, 190], [750, 820, 145], [850, 1150, 240], [370, 1260, 95]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/><circle cx="${x}" cy="${y}" r="${r / 3}"/>`).join('');
  else if (subjectId === 'economics-business') art = [220, 380, 540, 700, 860].map((x, i) => `<path d="M${x} 1280V${1110 - i * 90}H${x + 90}V1280"/>`).join('') + '<path d="M180 1120L450 1020L680 830L1080 700" stroke-width="10"/>';
  else if (subjectId === 'social-sciences') art = '<path d="M280 950L600 760L940 920L830 1240L410 1220Z M280 950L830 1240 M600 760L410 1220 M940 920L410 1220"/>' + [[280, 950], [600, 760], [940, 920], [830, 1240], [410, 1220]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="49" fill="${background}"/>`).join('');
  else if (subjectId === 'education-humanities') art = '<path d="M600 850Q390 740 180 820V1220Q390 1140 600 1250Q810 1140 1020 1220V820Q810 740 600 850V1250"/>' + [900, 980, 1060].map(y => `<path d="M250 ${y}Q400 ${y - 40} 530 ${y + 20} M670 ${y + 20}Q800 ${y - 40} 950 ${y}"/>`).join('');
  else art = [0, 45, 90, 135].map(angle => `<rect x="390" y="740" width="420" height="420" transform="rotate(${angle} 600 950)"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1697" viewBox="0 0 1200 1697"><rect width="1200" height="1697" fill="${background}"/><path d="M75 75H1125V1622H75Z" fill="none" stroke="${accent}" stroke-opacity=".35"/><rect x="75" y="75" width="13" height="1547" fill="${accent}"/><text x="135" y="200" fill="#fff" font-family="Georgia,serif" font-size="77">${escapeXml(settings.journal_name)}</text><text x="140" y="255" fill="${accent}" font-family="sans-serif" font-size="20" letter-spacing="6">INTERNATIONAL SCIENTIFIC JOURNAL</text><path d="M140 305H1060" stroke="${accent}"/><text x="140" y="380" fill="${accent}" font-family="sans-serif" font-size="21" letter-spacing="4">SUBJECT COLLECTION</text>${titleLines.map((line, i) => `<text x="135" y="${490 + i * 93}" fill="#fff" font-family="Georgia,serif" font-size="79">${escapeXml(line)}</text>`).join('')}<g stroke="${accent}" color="${accent}" fill="none" stroke-width="3" opacity=".65">${art}</g><rect x="135" y="1390" width="925" height="2" fill="${accent}"/><text x="140" y="1460" fill="#fff" font-family="sans-serif" font-size="29" letter-spacing="3">${issue ? `VOLUME ${escapeXml(issue.volume)} · ISSUE ${escapeXml(issue.issue_number)} · ${escapeXml(issue.year)}` : 'RESEARCH &amp; SCHOLARSHIP'}</text><text x="140" y="1530" fill="${accent}" font-family="sans-serif" font-size="20">${escapeXml(settings.publisher.slice(0, 100))}</text><text x="140" y="1575" fill="${accent}" font-family="sans-serif" font-size="18" letter-spacing="3">OPEN ACCESS · PEER-REVIEWED RESEARCH</text></svg>`;
}
