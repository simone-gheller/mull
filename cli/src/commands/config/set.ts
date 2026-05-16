import { clack, GREEN, DIM, fail } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { parseFlags } from '../../lib/flags.ts';
import { resolveApp, resolveEnv } from '../../lib/resolve.ts';
import { loadLocalConfig } from '../../lib/localConfig.ts';

export async function configSetCommand(args: string[]): Promise<void> {
  process.stderr.write(`  ↳ deprecated: use 'vextis params set <key>'\n\n`);
  // vextis config set <key> <value> [--app x] [--env y] [--live] [--secret]
  const [key, value, ...rest] = args;
  if (!key) fail('Usage: vextis config set <key> <value> [--app <name>] [--env <name>]');
  if (value === undefined) fail(`Usage: vextis config set ${key} <value>`);

  const { flags } = parseFlags(rest);
  const localCfg = loadLocalConfig();

  const appName = flags.app ?? localCfg?.project;
  const envName = flags.env ?? localCfg?.env;

  if (!appName) fail('--app <name> is required');
  if (!envName) fail('--env <name> is required');

  const cfg = requireConfig();
  const [app, env] = await Promise.all([
    resolveApp(cfg.activeOrgId, appName),
    resolveEnv(cfg.activeOrgId, envName),
  ]);

  const params = new URLSearchParams({ org: cfg.activeOrgId, project: app.id, env: env.id });
  const body = {
    value,
    live: flags.live !== undefined,
    secret: flags.secret !== undefined,
  };

  const res = await fetch(`${cfg.apiUrl}/v1/config/${encodeURIComponent(key)}?${params}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${cfg.orgs[cfg.activeOrgId]?.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) { console.error('Run: vextis auth login'); process.exit(1); }
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    fail(b.message ?? `Error ${res.status}`);
  }

  const result = await res.json() as { version: number; changedKeys: string[] };
  process.stderr.write(
    `  ${GREEN('✓')} ${key} updated (version ${result.version}) — ${DIM(`${appName} · ${envName}`)}\n`
  );
}
