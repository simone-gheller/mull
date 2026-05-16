import { clack, DIM, formatTable } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { apiGet } from '../../lib/api.ts';
import { parseFlags } from '../../lib/flags.ts';
import { isJsonMode, printJson } from '../../lib/output.ts';
import { errorExit } from '../../lib/errors.ts';

interface AppItem {
  id: string;
  name: string;
  depth: number;
  ancestors: string[];
  _count?: { parameters: number };
}

export async function appsListCommand(args: string[] = []): Promise<void> {
  const { flags } = parseFlags(args);
  const cfg = requireConfig();
  const res = await apiGet(`/orgs/${cfg.activeOrgId}/apps`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    errorExit(body.message || `Error ${res.status}`);
  }

  const apps = await res.json() as AppItem[];

  if (isJsonMode(flags)) {
    printJson(apps.map(a => ({
      id: a.id,
      name: a.name,
      depth: a.depth,
      parameterCount: a._count?.parameters ?? 0,
    })));
    return;
  }

  if (apps.length === 0) {
    clack.log.info('No apps found.');
    return;
  }

  const orgEntry = cfg.orgs[cfg.activeOrgId];
  if (orgEntry?.name) {
    process.stderr.write(`\n  ${DIM(orgEntry.name)}\n`);
  }

  const rows: [string, string][] = apps.map(a => {
    const indent = '  '.repeat(a.depth);
    const count = a._count?.parameters ?? 0;
    return [`${indent}${a.name}`, DIM(`${count} param${count !== 1 ? 's' : ''}`)];
  });

  console.log('\n' + formatTable(rows) + '\n');
}
