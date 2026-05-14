import { clack, GREEN, DIM, formatTable, fail } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { apiGet } from '../../lib/api.ts';
import { parseFlags } from '../../lib/flags.ts';
import { resolveApp, resolveEnv } from '../../lib/resolve.ts';

interface ResolvedItem {
  key: string;
  relationship: string;
  parameter: { id: string; appId: string; appName: string; description?: string };
  value?: {
    state: 'set' | 'inherited' | 'unset' | 'redacted';
    value?: string;
    canRead: boolean;
  };
}

interface ResolvedResponse {
  app: { id: string; name: string };
  environment?: { id: string; name: string };
  items: ResolvedItem[];
}

export async function paramsListCommand(args: string[]): Promise<void> {
  const { flags } = parseFlags(args);

  if (!flags.app) fail('--app <name> is required. Example: mull params list --app myapp');

  const cfg = requireConfig();
  const app = await resolveApp(cfg.activeOrgId, flags.app);

  let url = `/orgs/${cfg.activeOrgId}/parameters/resolved?appId=${app.id}`;
  let envName: string | undefined;

  if (flags.env) {
    const env = await resolveEnv(cfg.activeOrgId, flags.env);
    url += `&environmentId=${env.id}`;
    envName = env.name;
  }

  const res = await apiGet(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    clack.log.error(body.message || `Error ${res.status}`);
    process.exit(1);
  }

  const data = await res.json() as ResolvedResponse;

  if (data.items.length === 0) {
    clack.log.info('No parameters found.');
    return;
  }

  if (envName) {
    const rows: [string, string][] = data.items.map(item => {
      const v = item.value;
      let val: string;
      if (!v || v.state === 'unset') {
        val = DIM('unset');
      } else if (v.state === 'redacted') {
        val = DIM('[redacted]');
      } else if (v.state === 'inherited') {
        val = DIM(`${v.value ?? ''} ↑ ${item.parameter.appName}`);
      } else {
        val = GREEN(v.value ?? '');
      }
      return [item.key, val];
    });
    console.log(`\n  ${DIM('app')}  ${GREEN(app.name)}   ${DIM('env')}  ${GREEN(envName)}\n`);
    console.log(formatTable(rows) + '\n');
  } else {
    const rows: [string, string][] = data.items.map(item => [
      item.key,
      DIM(item.parameter.description || '—'),
    ]);
    console.log(`\n  ${DIM('app')}  ${GREEN(app.name)}\n`);
    console.log(formatTable(rows) + '\n');
  }
}
