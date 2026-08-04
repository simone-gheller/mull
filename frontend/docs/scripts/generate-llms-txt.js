// Generates public/llms.txt from the same nav data that drives the sidebar and search index,
// so the machine-readable page list can't drift from what's actually published.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { DOC_GROUPS } from '../src/content/navigation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../public/llms.txt');

const lines = [
  '# vextis docs',
  '',
  '> Secure app config for local development and CI — organizations, apps, environments, and encrypted parameters, managed from a CLI.',
  '',
];

for (const group of DOC_GROUPS) {
  lines.push(`## ${group.title}`);
  for (const page of group.pages) {
    const soon = page.badge === 'soon' ? ' (not yet published)' : '';
    lines.push(`- [${page.title}](https://docs.vextis.io${page.path}): ${page.description}${soon}`);
  }
  lines.push('');
}

writeFileSync(outPath, lines.join('\n'));
console.log(`Wrote ${outPath}`);
