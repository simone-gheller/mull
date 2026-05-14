import { clack, GREEN, DIM, formatTable } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { apiGet } from '../../lib/api.ts';

interface EnvItem {
  id: string;
  name: string;
  tier: string;
  protected: boolean;
}

export async function envsListCommand(): Promise<void> {
  const cfg = requireConfig();
  const res = await apiGet(`/orgs/${cfg.activeOrgId}/environments`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    clack.log.error(body.message || `Error ${res.status}`);
    process.exit(1);
  }

  const envs = await res.json() as EnvItem[];
  if (envs.length === 0) {
    clack.log.info('No environments found.');
    return;
  }

  const rows: [string, string][] = envs.map(e => [
    e.name,
    DIM(`${e.tier.toLowerCase()}${e.protected ? '  ★ protected' : ''}`),
  ]);

  console.log('\n' + formatTable(rows) + '\n');
}
