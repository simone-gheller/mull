import { clack, GREEN, DIM, AMBER } from '../lib/ui.ts';
import { requireConfig } from '../lib/config.ts';
import { apiGet } from '../lib/api.ts';
import { parseFlags } from '../lib/flags.ts';
import { isTTY } from '../lib/output.ts';
import { errorExit, usageError } from '../lib/errors.ts';
import { loadLocalConfig, saveLocalConfig, localConfigPath } from '../lib/localConfig.ts';
import { existsSync, readFileSync } from 'node:fs';

interface AppItem { id: string; name: string; depth: number }
interface EnvItem { id: string; name: string; protected: boolean }

export async function linkCommand(args: string[]): Promise<void> {
  const { flags } = parseFlags(args);
  const cfg = requireConfig();

  let appName = flags.app as string | undefined;
  let envName = flags.env as string | undefined;

  // Check if already linked
  const existing = loadLocalConfig();
  if (existing) {
    if (isTTY()) {
      const relink = await clack.confirm({
        message: `Already linked to ${DIM(existing.project + ' · ' + existing.env)}. Re-link?`,
        initialValue: false,
      });
      if (clack.isCancel(relink) || !relink) {
        clack.cancel('Cancelled.');
        process.exit(0);
      }
    }
  }

  // Resolve app
  if (!appName) {
    if (!isTTY()) usageError('--app <name> is required in non-interactive mode.');
    const appsRes = await apiGet(`/orgs/${cfg.activeOrgId}/apps`);
    if (!appsRes.ok) errorExit(`Failed to fetch apps (${appsRes.status})`);
    const apps = await appsRes.json() as AppItem[];
    if (apps.length === 0) errorExit('No apps found in this org.', 'create an app in the dashboard first');

    const selected = await clack.select({
      message: 'Select app:',
      options: apps.map(a => ({ value: a.name, label: '  '.repeat(a.depth) + a.name })),
    });
    if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }
    appName = selected as string;
  }

  // Resolve env
  if (!envName) {
    if (!isTTY()) usageError('--env <name> is required in non-interactive mode.');
    const envsRes = await apiGet(`/orgs/${cfg.activeOrgId}/environments`);
    if (!envsRes.ok) errorExit(`Failed to fetch environments (${envsRes.status})`);
    const envs = await envsRes.json() as EnvItem[];
    if (envs.length === 0) errorExit('No environments found in this org.');

    const selected = await clack.select({
      message: 'Select environment:',
      options: envs.map(e => ({
        value: e.name,
        label: e.name + (e.protected ? ` ${AMBER('! protected')}` : ''),
      })),
    });
    if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }
    envName = selected as string;
  }

  saveLocalConfig({ project: appName, env: envName });

  process.stderr.write(`  ${GREEN('✓')} Written to ${DIM(localConfigPath())}\n`);
  process.stderr.write(`  ${DIM('↳ app')} ${GREEN(appName)}  ${DIM('env')} ${GREEN(envName)}\n`);

  // .gitignore hint for .vextis/
  let gitignoreHint = true;
  try {
    gitignoreHint = !readFileSync('.gitignore', 'utf-8').includes('.vextis');
  } catch { /* no .gitignore — still show hint */ }
  if (gitignoreHint) {
    process.stderr.write(`  ${DIM('↳ add .vextis to .gitignore')}\n`);
  }
  process.stderr.write('\n');
}
