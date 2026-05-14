import { clack, GREEN, DIM, fail } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { apiGet } from '../../lib/api.ts';
import { parseFlags } from '../../lib/flags.ts';
import { resolveApp, resolveEnv } from '../../lib/resolve.ts';
import { writeFileSync } from 'node:fs';

export async function configPullCommand(args: string[]): Promise<void> {
  const { flags } = parseFlags(args);

  if (!flags.app) fail('--app <name> is required');
  if (!flags.env) fail('--env <name> is required');

  const cfg = requireConfig();
  const [app, env] = await Promise.all([
    resolveApp(cfg.activeOrgId, flags.app),
    resolveEnv(cfg.activeOrgId, flags.env),
  ]);

  const res = await apiGet(`/orgs/${cfg.activeOrgId}/config/${app.id}/${env.id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    fail(body.message || `Error ${res.status}`);
  }

  const config = await res.json() as Record<string, string>;
  const entries = Object.entries(config);

  if (entries.length === 0) {
    clack.log.info('No config values found.');
    return;
  }

  if (flags.json === 'true') {
    const out = JSON.stringify(config, null, 2);
    if (flags.output) {
      writeFileSync(flags.output, out, 'utf-8');
      process.stderr.write(`  ${GREEN('✓')} written to ${DIM(flags.output)}\n`);
    } else {
      process.stdout.write(out + '\n');
    }
    return;
  }

  const lines = entries.map(([k, v]) => `${k}=${v}`).join('\n') + '\n';

  if (flags.output) {
    writeFileSync(flags.output, lines, 'utf-8');
    process.stderr.write(`  ${GREEN('✓')} written to ${DIM(flags.output)}\n`);
  } else {
    process.stdout.write(lines);
  }
}
