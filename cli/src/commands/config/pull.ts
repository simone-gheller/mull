import { clack } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { apiGet } from '../../lib/api.ts';
import { parseFlags } from '../../lib/flags.ts';
import { printJson } from '../../lib/output.ts';
import { errorExit } from '../../lib/errors.ts';
import { resolveAppInteractive, resolveEnvInteractive } from '../../lib/resolve.ts';
import { loadLocalConfig } from '../../lib/localConfig.ts';

export async function configPullCommand(args: string[]): Promise<void> {
  const { flags } = parseFlags(args);

  const cfg = requireConfig();
  const localCfg = loadLocalConfig();
  const [app, env] = await Promise.all([
    resolveAppInteractive(cfg.activeOrgId, (flags.app as string | undefined) ?? localCfg?.project),
    resolveEnvInteractive(cfg.activeOrgId, (flags.env as string | undefined) ?? localCfg?.env),
  ]);

  const res = await apiGet(`/orgs/${cfg.activeOrgId}/config/${app.id}/${env.id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    errorExit(body.message || `Error ${res.status}`);
  }

  const config = await res.json() as Record<string, string>;
  const entries = Object.entries(config);

  if (entries.length === 0) {
    clack.log.info('No config values found.');
    return;
  }

  const output = flags.output as string | undefined;
  const format = output === 'json' ? 'json' : 'env';

  if (format === 'json') {
    printJson(config);
    return;
  }

  process.stdout.write(entries.map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
}
