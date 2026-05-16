import { clack, GREEN, DIM, AMBER, mask, formatTable } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { apiGet } from '../../lib/api.ts';
import { parseFlags } from '../../lib/flags.ts';
import { isJsonMode, printJson } from '../../lib/output.ts';
import { errorExit } from '../../lib/errors.ts';
import { loadLocalConfig } from '../../lib/localConfig.ts';
import { resolveEnv, resolveAppInteractive } from '../../lib/resolve.ts';

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

  const localCfg = loadLocalConfig();
  const cfg = requireConfig();

  const app = await resolveAppInteractive(cfg.activeOrgId, (flags.app as string | undefined) ?? localCfg?.project);

  let url = `/orgs/${cfg.activeOrgId}/parameters/resolved?appId=${app.id}`;
  let envName: string | undefined;
  let isProtected = false;

  const envArg = (flags.env as string | undefined) ?? localCfg?.env;
  if (envArg) {
    const env = await resolveEnv(cfg.activeOrgId, envArg);
    url += `&environmentId=${env.id}`;
    envName = env.name;
    isProtected = env.protected;
  }

  const reveal = Boolean(flags.reveal);


  const shouldMask = isProtected && !reveal;

  const fetchStart = Date.now();
  const res = await apiGet(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    errorExit(body.message || `Error ${res.status}`);
  }
  const fetchMs = Date.now() - fetchStart;

  const data = await res.json() as ResolvedResponse;

  const setCount = data.items.filter(i => i.value?.state === 'set' || i.value?.state === 'inherited').length;

  if (isJsonMode(flags)) {
    printJson({
      app: app.name,
      environment: envName ?? null,
      protected: isProtected,
      params: data.items.map(item => ({
        key: item.key,
        relationship: item.relationship,
        description: item.parameter.description ?? null,
        isSet: item.value?.state === 'set' || item.value?.state === 'inherited',
        state: item.value?.state ?? 'unset',
        value: shouldMask ? null : (item.value?.value ?? null),
        inheritedFrom: item.value?.state === 'inherited' ? item.parameter.appName : null,
      })),
    });
    if (isProtected && reveal) process.stderr.write(`  ${DIM('↳ reveal logged to audit trail')}\n`);
    return;
  }

  if (data.items.length === 0) {
    clack.log.info('No parameters found.');
    return;
  }

  const syncedLabel = fetchMs < 1000 ? 'synced just now' : `synced ${(fetchMs / 1000).toFixed(1)}s ago`;

  const contextParts = [app.name, envName].filter(Boolean).join(' · ');
  const secretsLabel = envName ? `${setCount} secret${setCount !== 1 ? 's' : ''}` : `${data.items.length} param${data.items.length !== 1 ? 's' : ''}`;
  process.stderr.write(`\n  ${DIM('┌ ' + contextParts + ' · ' + secretsLabel)}`);
  if (isProtected) process.stderr.write(`  ${AMBER('! protected')}`);
  process.stderr.write(`\n  ${DIM('└ ' + syncedLabel)}\n\n`);

  const termWidth = process.stdout.columns ?? 100;
  // indent(2) + gap(2) + gap(2) = 6 chars overhead
  const KEY_CAP = Math.min(40, Math.floor(termWidth * 0.4));

  function truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  if (envName) {
    const rawKeyWidth = Math.max(...data.items.map(i => i.key.length));
    const keyWidth = Math.min(rawKeyWidth, KEY_CAP);
    const valWidth = Math.max(termWidth - keyWidth - 6, 20);

    for (const item of data.items) {
      const v = item.value;
      const keyDisplay = DIM(truncate(item.key, keyWidth).padEnd(keyWidth));
      let valStr: string;

      if (!v || v.state === 'unset') {
        valStr = DIM('——');
      } else if (v.state === 'redacted') {
        valStr = DIM('[redacted]');
      } else if (v.state === 'inherited') {
        const raw = shouldMask ? mask(v.value ?? '') : truncate(v.value ?? '', valWidth - 20);
        valStr = (shouldMask ? AMBER(raw) : DIM(raw)) + DIM(`  ↑ ${item.parameter.appName}`);
      } else {
        const raw = shouldMask ? mask(v.value ?? '') : truncate(v.value ?? '', valWidth);
        valStr = shouldMask ? AMBER(raw) : GREEN(raw);
      }

      process.stdout.write(`  ${keyDisplay}  ${valStr}\n`);
    }

    if (isProtected && reveal) {
      process.stderr.write(`\n  ${DIM('↳ reveal logged to audit trail')}\n`);
    } else if (isProtected && !reveal) {
      process.stderr.write(`\n  ${DIM('↳ use --reveal to show values (will be logged to audit trail)')}\n`);
    }
    process.stdout.write('\n');
  } else {
    const rawKeyWidth = Math.max(...data.items.map(i => i.key.length));
    const keyWidth = Math.min(rawKeyWidth, KEY_CAP);
    const descWidth = Math.max(termWidth - keyWidth - 6, 20);
    const rows: [string, string][] = data.items.map(item => [
      truncate(item.key, keyWidth),
      DIM(truncate(item.parameter.description || '—', descWidth)),
    ]);
    console.log(formatTable(rows) + '\n');
  }
}
