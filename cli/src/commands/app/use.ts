import { GREEN, DIM } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { apiGet } from '../../lib/api.ts';
import { errorExit, notFound } from '../../lib/errors.ts';
import { loadLocalConfig, saveLocalConfig, localConfigPath } from '../../lib/localConfig.ts';

interface AppItem { id: string; name: string; depth: number }

export async function appUseCommand(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) errorExit('Usage: vextis app use <name>', undefined, 2);

  const cfg = requireConfig();
  const res = await apiGet(`/orgs/${cfg.activeOrgId}/apps`);
  if (!res.ok) errorExit(`Failed to fetch apps (${res.status})`);

  const apps = await res.json() as AppItem[];
  const match = apps.find(a => a.name.toLowerCase() === name.toLowerCase());
  if (!match) notFound('app', name, 'run: vextis app list');

  const current = loadLocalConfig();
  saveLocalConfig({ project: match.name, env: current?.env ?? '' });

  process.stderr.write(`  ${GREEN('✓')} Active app set to ${GREEN(match.name)}  ${DIM(localConfigPath())}\n`);
  if (!current?.env) {
    process.stderr.write(`  ${DIM('↳ no active env — run: vextis env use <name>')}\n`);
  }
}
