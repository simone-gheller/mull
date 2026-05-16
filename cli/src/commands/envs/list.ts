import { clack, DIM, AMBER, formatTable } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { apiGet } from '../../lib/api.ts';
import { parseFlags } from '../../lib/flags.ts';
import { isJsonMode, printJson } from '../../lib/output.ts';
import { errorExit } from '../../lib/errors.ts';
import { loadLocalConfig } from '../../lib/localConfig.ts';

interface EnvItem {
  id: string;
  name: string;
  tier: string;
  protected: boolean;
}

export async function envsListCommand(args: string[] = []): Promise<void> {
  const { flags } = parseFlags(args);
  const cfg = requireConfig();
  const localCfg = loadLocalConfig();
  const activeEnv = localCfg?.env ?? null;

  const res = await apiGet(`/orgs/${cfg.activeOrgId}/environments`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    errorExit(body.message || `Error ${res.status}`);
  }

  const envs = await res.json() as EnvItem[];

  if (isJsonMode(flags)) {
    printJson(envs.map(e => ({
      id: e.id,
      name: e.name,
      tier: e.tier,
      protected: e.protected,
      active: e.name === activeEnv,
    })));
    return;
  }

  if (envs.length === 0) {
    clack.log.info('No environments found.');
    return;
  }

  const rows: [string, string][] = envs.map(e => {
    const isActive = e.name === activeEnv;
    const nameLabel = isActive ? `▸ ${e.name}` : `  ${e.name}`;
    const meta = [
      e.tier.toLowerCase(),
      e.protected ? AMBER('! protected') : '',
      isActive ? DIM('(active)') : '',
    ].filter(Boolean).join('  ');
    return [nameLabel, meta];
  });

  const maxKey = Math.max(...rows.map(([k]) => k.length));
  const formatted = rows.map(([k, v]) => `  ${DIM(k.padEnd(maxKey))}  ${v}`).join('\n');
  console.log('\n' + formatted + '\n');
}
