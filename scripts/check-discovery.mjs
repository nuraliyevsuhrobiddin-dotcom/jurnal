import nextEnv from '@next/env';
import { mkdir, writeFile } from 'node:fs/promises';

nextEnv.loadEnvConfig(process.cwd());
const base = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://agmjoural.uz').origin;
const results = [];
const report = (status, check, detail) => { results.push({ status, check, detail }); console.log(`[${status}] ${check}: ${detail}`); };
const decode = text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attr = (tag, name) => decode(tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1] || '');
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => match[0]);
const meta = (html, name) => tags(html, 'meta').filter(tag => attr(tag, 'name').toLowerCase() === name).map(tag => attr(tag, 'content'));
const canonical = html => attr(tags(html, 'link').find(tag => attr(tag, 'rel') === 'canonical') || '', 'href');
async function read(path, userAgent) {
  const url = new URL(path, base);
  if (url.origin !== base) throw new Error('Sitemap tashqi domenga havola berdi.');
  const response = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': userAgent || 'AGMJournal-DiscoveryCheck/1.0' }, signal: AbortSignal.timeout(20000) });
  return { status: response.status, url: response.url, robots: response.headers.get('x-robots-tag') || '', text: await response.text() };
}
async function inspectPage(path, scholar = false) {
  try {
    const page = await read(path, 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
    const url = new URL(path, base).toString();
    report(page.status === 200 ? 'OK' : 'ERROR', `HTTP ${path}`, String(page.status));
    const blocked = /\b(?:noindex|none)\b/i.test([page.robots, ...meta(page.text, 'robots'), ...meta(page.text, 'googlebot')].join(' '));
    report(blocked ? 'ERROR' : 'OK', `Indekslash ${path}`, blocked ? 'noindex topildi' : 'noindex yo‘q; bu Google indekslaganini bildirmaydi');
    const link = canonical(page.text);
    report(link === url ? 'OK' : 'ERROR', `Canonical ${path}`, link || 'canonical topilmadi');
    report(/<h1\b/i.test(page.text) && /<title>[^<]+<\/title>/i.test(page.text) ? 'OK' : 'ERROR', `HTML ${path}`, 'JavaScriptsiz sarlavha va asosiy matn mavjudligini tekshirish');
    if (scholar) {
      for (const name of ['citation_title', 'citation_author', 'citation_publication_date', 'citation_pdf_url']) {
        report(meta(page.text, name).some(Boolean) ? 'OK' : 'ERROR', `${name} ${path}`, meta(page.text, name).some(Boolean) ? 'mavjud' : 'topilmadi');
      }
      report(page.text.includes('ScholarlyArticle') ? 'OK' : 'ERROR', `JSON-LD ${path}`, page.text.includes('ScholarlyArticle') ? 'mavjud' : 'topilmadi');
    }
    return page;
  } catch (error) { report('ERROR', path, error.message); }
}

console.log(`AGM Journal — qidiruvga tayyorlik: ${base}`);
try {
  const robots = await read('/robots.txt');
  report(robots.status === 200 ? 'OK' : 'ERROR', 'robots.txt', `HTTP ${robots.status}`);
  report(robots.text.includes(`${base}/sitemap.xml`) ? 'OK' : 'ERROR', 'Sitemap e’loni', `${base}/sitemap.xml`);
  report(/^(?:Disallow):\s*\/\s*$/im.test(robots.text) ? 'ERROR' : 'OK', 'Umumiy robot qoidasi', 'Butun saytni bloklash qoidasi');
  const sitemap = await read('/sitemap.xml');
  const urls = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decode(match[1]));
  report(sitemap.status === 200 && urls.length > 0 ? 'OK' : 'ERROR', 'Sitemap XML', `HTTP ${sitemap.status}; ${urls.length} URL`);
  const foreign = urls.filter(url => new URL(url).origin !== base);
  report(foreign.length ? 'ERROR' : 'OK', 'Sitemap domeni', `${foreign.length} ta boshqa domen URL’i`);
  const home = await inspectPage('/en');
  const token = home && meta(home.text, 'google-site-verification').some(Boolean);
  report(token ? 'OK' : 'ACTION', 'Search Console', token ? 'HTML tasdiqlash tokeni bor; hisobdagi tasdiq alohida tekshiriladi' : 'HTML tokeni yo‘q. DNS orqali tasdiqlangan bo‘lishi mumkin; Search Console hisobida tekshiring.');
  const articleUrls = [...new Set(urls.filter(url => /\/en\/article\//.test(url)))];
  report(articleUrls.length ? 'OK' : 'ACTION', 'Maqolalar', `${articleUrls.length} ta inglizcha maqola URL’i`);
  for (const url of articleUrls.slice(0, 5)) await inspectPage(new URL(url).pathname, true);
} catch (error) { report('ERROR', 'Ulanish', error.message); }
report('ACTION', 'Google hisoboti', 'Search Console → URL Inspection → Test live URL va Request indexing; Sitemaps → sitemap.xml. Indekslash kafolatlanmaydi.');
if (process.argv.includes('--report')) {
  await mkdir('artifacts/search-discovery', { recursive: true });
  await writeFile('artifacts/search-discovery/report.json', JSON.stringify({ checkedAt: new Date().toISOString(), base, results }, null, 2));
}
process.exitCode = results.some(result => result.status === 'ERROR') ? 1 : 0;
