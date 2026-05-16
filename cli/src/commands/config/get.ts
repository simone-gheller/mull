import { fail } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { parseFlags } from '../../lib/flags.ts';
import { resolveApp, resolveEnv } from '../../lib/resolve.ts';
import { loadLocalConfig } from '../../lib/localConfig.ts';

interface ConfigSnapshot {
  values: Record<string, unknown>;
}

export async function configGetCommand(args: string[]): Promise<void> {
  process.stderr.write(`  ↳ deprecated: use 'vextis params get <key>'\n\n`);
  const [key, ...rest] = args;
  if (!key) fail('Usage: vextis config get <key> [--app <name>] [--env <name>]');

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
  const res = await fetch(`${cfg.apiUrl}/v1/config?${params}`, {
    headers: { Authorization: `Bearer ${cfg.orgs[cfg.activeOrgId]?.token}` },
  });

  if (res.status === 401) { console.error('Run: vextis auth login'); process.exit(1); }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    fail(body.message ?? `Error ${res.status}`);
  }

  const snapshot = await res.json() as ConfigSnapshot;
  const value = snapshot.values?.[key];

  if (value === undefined) {
    process.stderr.write(`Key '${key}' not found.\n`);
    process.exit(1);
  }

  process.stdout.write(String(value) + '\n');
}
