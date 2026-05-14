import { clack, GREEN, DIM, formatTable } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { apiGet } from '../../lib/api.ts';

interface AppItem {
  id: string;
  name: string;
  depth: number;
  ancestors: string[];
  _count?: { parameters: number };
}

export async function appsListCommand(): Promise<void> {
  const cfg = requireConfig();
  const res = await apiGet(`/orgs/${cfg.activeOrgId}/apps`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    clack.log.error(body.message || `Error ${res.status}`);
    process.exit(1);
  }

  const apps = await res.json() as AppItem[];
  if (apps.length === 0) {
    clack.log.info('No apps found.');
    return;
  }

  const rows: [string, string][] = apps.map(a => {
    const indent = '  '.repeat(a.depth);
    const count = a._count?.parameters ?? 0;
    return [`${indent}${a.name}`, DIM(`${count} param${count !== 1 ? 's' : ''}`)];
  });

  console.log('\n' + formatTable(rows) + '\n');
}
