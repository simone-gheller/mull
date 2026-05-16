import { execSync } from 'node:child_process';
import { clack, GREEN, DIM, AMBER, mask, formatTable } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { apiGet } from '../../lib/api.ts';
import { parseFlags } from '../../lib/flags.ts';
import { isJsonMode, isPlainMode, printJson, printPlain } from '../../lib/output.ts';
import { errorExit, notFound } from '../../lib/errors.ts';
import { resolveAppInteractive, resolveEnvInteractive } from '../../lib/resolve.ts';
import { loadLocalConfig } from '../../lib/localConfig.ts';

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

function copyToClipboard(text: string): boolean {
  const cmds = [
    ['pbcopy'],
    ['xclip', '-selection', 'clipboard'],
    ['xsel', '--clipboard', '--input'],
    ['clip'],
  ];
  for (const [cmd, ...args] of cmds) {
    try {
      execSync([cmd, ...args].join(' '), { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
      return true;
    } catch {
      // try next
    }
  }
  return false;
}

export async function paramsGetCommand(args: string[]): Promise<void> {
  const { flags, positional } = parseFlags(args);

  const key = positional[0];
  if (!key) errorExit('Key is required.', 'example: vextis params get JWT_SECRET --app myapp --env staging');

  const localCfg = loadLocalConfig();
  const appName = (flags.app as string | undefined) ?? localCfg?.project;
  const envName = (flags.env as string | undefined) ?? localCfg?.env;

  const cfg = requireConfig();
  const [app, env] = await Promise.all([
    resolveAppInteractive(cfg.activeOrgId, appName),
    resolveEnvInteractive(cfg.activeOrgId, envName),
  ]);

  const url = `/orgs/${cfg.activeOrgId}/parameters/resolved?appId=${app.id}&environmentId=${env.id}`;
  const res = await apiGet(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    errorExit(body.message || `Error ${res.status}`);
  }

  const data = await res.json() as ResolvedResponse;
  const item = data.items.find(i => i.key === key);

  if (!item) {
    notFound('parameter', key, `run: vextis params list --app ${appName}`);
  }

  const v = item.value;
  const rawValue = v?.value ?? null;
  const state = v?.state ?? 'unset';
  const isProtected = env.protected;
  const reveal = Boolean(flags.reveal);


  const shouldMask = isProtected && !reveal;

  if (isJsonMode(flags)) {
    printJson({
      key,
      app: app.name,
      environment: env.name,
      protected: isProtected,
      state,
      value: shouldMask ? null : rawValue,
      inheritedFrom: state === 'inherited' ? item.parameter.appName : null,
    });
    if (isProtected) process.stderr.write(`  ${DIM('↳ reveal logged to audit trail')}\n`);
    return;
  }

  if (isPlainMode(flags)) {
    if (rawValue === null) {
      errorExit(`${key} has no value.`);
    }
    printPlain(rawValue);
    return;
  }

  if (flags.copy) {
    if (rawValue === null) errorExit(`${key} has no value to copy.`);
    const copied = copyToClipboard(rawValue);
    if (copied) {
      process.stderr.write(`  ${GREEN('✓')} ${key} copied to clipboard\n`);
      if (isProtected) process.stderr.write(`  ${DIM('↳ reveal logged to audit trail')}\n`);
    } else {
      errorExit('Could not copy to clipboard.', 'use --plain to print the value');
    }
    return;
  }

  // Human output
  const displayVal = shouldMask
    ? AMBER(mask(rawValue ?? ''))
    : (state === 'inherited' ? DIM(rawValue ?? '') : GREEN(rawValue ?? ''));

  const rows: [string, string][] = [
    [key, displayVal],
  ];

  const meta: [string, string][] = [
    ['app', DIM(app.name)],
    ['env', DIM(env.name)],
    ['state', DIM(state)],
  ];
  if (state === 'inherited') meta.push(['inherited from', DIM(item.parameter.appName)]);

  console.log('\n' + formatTable(rows) + '\n');
  console.log(formatTable(meta));

  if (isProtected && shouldMask) {
    process.stderr.write(`\n  ${DIM('↳ use --reveal to show value (will be logged to audit trail)')}\n`);
  }
  process.stdout.write('\n');
}
