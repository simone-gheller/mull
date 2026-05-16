import { spawn } from 'node:child_process';
import { clack, GREEN, DIM, fail } from '../lib/ui.ts';
import { requireConfig } from '../lib/config.ts';
import { parseFlags } from '../lib/flags.ts';
import { resolveApp, resolveEnv } from '../lib/resolve.ts';
import { loadLocalConfig } from '../lib/localConfig.ts';

interface ConfigSnapshot {
  values: Record<string, string>;
}

export async function runCommand(args: string[]): Promise<void> {
  // Split on '--' separator: vextis run [--app x] [--env y] -- npm run dev
  const dashIdx = args.indexOf('--');
  if (dashIdx === -1) {
    fail('Usage: vextis run [--app <name>] [--env <name>] -- <command> [args...]');
  }

  const mullArgs = args.slice(0, dashIdx);
  const childArgs = args.slice(dashIdx + 1);
  if (childArgs.length === 0) {
    fail('No command specified after --');
  }

  const { flags } = parseFlags(mullArgs);
  const localCfg = loadLocalConfig();

  const appName = flags.app ?? localCfg?.project;
  const envName = flags.env ?? localCfg?.env;

  if (!appName) fail('--app <name> is required (or set project in .vextis/config.json via `vextis link`)');
  if (!envName) fail('--env <name> is required (or set env in .vextis/config.json via `vextis env use <name>`)');

  const cfg = requireConfig();

  const [app, env] = await Promise.all([
    resolveApp(cfg.activeOrgId, appName),
    resolveEnv(cfg.activeOrgId, envName),
  ]);

  const params = new URLSearchParams({
    org: cfg.activeOrgId,
    project: app.id,
    env: env.id,
  });

  const res = await fetch(`${cfg.apiUrl}/v1/config?${params}`, {
    headers: {
      Authorization: `Bearer ${cfg.orgs[cfg.activeOrgId]?.token}`,
    },
  });

  if (res.status === 401) {
    console.error('Session expired or revoked. Run: vextis auth login');
    process.exit(1);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    fail(body.message ?? `Config fetch failed: HTTP ${res.status}`);
  }

  const snapshot = await res.json() as ConfigSnapshot;
  const values = snapshot.values ?? {};

  process.stderr.write(
    `  ${GREEN('✓')} injected ${Object.keys(values).length} keys (${DIM(appName)} · ${DIM(envName)})\n`
  );

  const [command, ...cmdArgs] = childArgs;
  const childEnv: Record<string, string> = { ...process.env as Record<string, string> };
  for (const [k, v] of Object.entries(values)) {
    childEnv[k] = String(v);
  }

  const child = spawn(command, cmdArgs, {
    env: childEnv,
    stdio: 'inherit',
    shell: false,
  });

  // Forward signals to child so Ctrl-C / Docker stop work correctly
  process.on('SIGTERM', () => { child.kill('SIGTERM'); });
  process.on('SIGINT',  () => { child.kill('SIGINT'); });

  child.on('close', (code) => process.exit(code ?? 0));
  child.on('error', (err) => {
    console.error(`Failed to start process: ${err.message}`);
    process.exit(1);
  });
}
