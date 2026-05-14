import { readFileSync, mkdirSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version: string = pkg.version;

const argTarget = process.argv.find(a => a.startsWith('--target='))?.split('=')[1];
const targets = argTarget
  ? [argTarget]
  : ['bun-darwin-arm64', 'bun-darwin-x64', 'bun-linux-x64', 'bun-windows-x64'];

const apiUrl = process.env.API_URL || 'https://api.safeconfig.io';
const appUrl = process.env.APP_URL || 'https://app.safeconfig.io';

mkdirSync('./dist', { recursive: true });

for (const target of targets) {
  const ext = target.includes('windows') ? '.exe' : '';
  const outfile = `./dist/mull-${target.replace('bun-', '')}${ext}`;
  console.log(`Building ${outfile}…`);

  const proc = Bun.spawnSync([
    'bun', 'build',
    '--compile',
    `--target=${target}`,
    `--outfile=${outfile}`,
    '--minify',
    '--env=*',
    'src/index.ts',
  ], {
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...process.env, CLI_VERSION: version, API_URL: apiUrl, APP_URL: appUrl },
  });

  if (proc.exitCode !== 0) {
    console.error(`Build failed for ${target}`);
    process.exit(1);
  }
}

console.log('Done.');
