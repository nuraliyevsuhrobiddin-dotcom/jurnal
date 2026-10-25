import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
// Load the same TypeScript builder used by the API, without a separate template implementation.
const previous = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  module._compile(result.outputText, filename);
};
try {
  const { generateManuscriptTemplate } = require('../src/lib/manuscript-template.ts');
  const directory = path.resolve('artifacts/manuscript-templates');
  await mkdir(directory, { recursive: true });
  for (const lang of ['uz', 'ru', 'en']) {
    const filename = path.join(directory, `AGM-${lang}-manuscript-template.docx`);
    await writeFile(filename, await generateManuscriptTemplate(lang));
    console.log(filename);
  }
} finally {
  if (previous) require.extensions['.ts'] = previous;
  else delete require.extensions['.ts'];
}
