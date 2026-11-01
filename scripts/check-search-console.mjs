import nextEnv from '@next/env';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
nextEnv.loadEnvConfig(process.cwd());
const require = createRequire(import.meta.url);
const ts = require('typescript');
const previous = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  module._compile(result.outputText, filename);
};
try {
  const { searchConsoleReport, submitSearchConsoleSitemap } = require('../src/lib/search-console.ts');
  const { SITE_URL } = require('../src/lib/site-url.ts');
  if (process.argv.includes('--submit')) console.log(JSON.stringify({ submitted: await submitSearchConsoleSitemap() }));
  const sitemap = await fetch(`${SITE_URL}/sitemap.xml`, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!sitemap.ok) throw new Error('Public sitemap is unavailable');
  const articleUrls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]).filter(url => url.startsWith(`${SITE_URL}/uz/article/`)).slice(0, 3);
  const report = { checked_at: new Date().toISOString(), ...await searchConsoleReport([`${SITE_URL}/uz`, ...articleUrls]) };
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--report')) {
    await mkdir('artifacts/search-discovery', { recursive: true });
    await writeFile('artifacts/search-discovery/google-index-status.json', JSON.stringify(report, null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Search Console check failed.');
  process.exitCode = 1;
} finally {
  if (previous) require.extensions['.ts'] = previous;
  else delete require.extensions['.ts'];
}
