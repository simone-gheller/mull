import { clack, GREEN, DIM, AMBER } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { apiGet, apiPut } from '../../lib/api.ts';
import { parseFlags } from '../../lib/flags.ts';
import { isTTY } from '../../lib/output.ts';
import { errorExit, notFound } from '../../lib/errors.ts';
import { resolveAppInteractive, resolveEnvInteractive } from '../../lib/resolve.ts';
import { loadLocalConfig } from '../../lib/localConfig.ts';

interface ValueEntry {
  id: string;
  parameterId: string;
  parameterKey: string;
  isSet: boolean;
  value: string | null;
}

type ValuesResponse = Record<string, { environmentId: string; values: ValueEntry[] }>;

export async function paramsSetCommand(args: string[]): Promise<void> {
  const { flags, positional } = parseFlags(args);

  const key = positional[0];
  if (!key) errorExit('Key is required.', 'example: vextis params set MY_KEY --app myapp --env prod');

  const cfg = requireConfig();
  const localCfg = loadLocalConfig();
  const [app, env] = await Promise.all([
    resolveAppInteractive(cfg.activeOrgId, (flags.app as string | undefined) ?? localCfg?.project),
    resolveEnvInteractive(cfg.activeOrgId, (flags.env as string | undefined) ?? localCfg?.env),
  ]);

  // Protected env confirmation
  if (env.protected && !flags.force) {
    if (isTTY()) {
      process.stderr.write(`  ${AMBER('!')}  ${env.name} is a protected environment.\n`);
      const confirmed = await clack.confirm({
        message: `Write ${key} to ${env.name}?`,
        initialValue: false,
      });
      if (clack.isCancel(confirmed) || !confirmed) {
        clack.cancel('Cancelled.');
        process.exit(0);
      }
    } else {
      errorExit(
        `${env.name} is a protected environment.`,
        'pass --force to skip confirmation in non-interactive mode',
        4
      );
    }
  }

  const valRes = await apiGet(`/orgs/${cfg.activeOrgId}/parameters/${app.id}/values`);
  if (!valRes.ok) {
    const body = await valRes.json().catch(() => ({})) as { message?: string };
    errorExit(body.message || `Error ${valRes.status}`);
  }

  const valData = await valRes.json() as ValuesResponse;
  const envEntry = Object.values(valData).find(e => e.environmentId === env.id);
  if (!envEntry) errorExit(`No parameter values found for environment '${flags.env}'.`);

  const valueEntry = envEntry.values.find(v => v.parameterKey === key);
  if (!valueEntry) {
    notFound('parameter', key, `run: vextis params list --app ${flags.app}`);
  }

  // --value flag for CI
  let value: string;
  if (flags.value !== undefined) {
    value = flags.value as string;
  } else {
    const result = await clack.password({
      message: `Value for ${GREEN(key)} in ${DIM(flags.env as string)} (hidden):`,
    });
    if (clack.isCancel(result)) {
      clack.cancel('Cancelled.');
      process.exit(0);
    }
    value = result as string;
  }

  const putRes = await apiPut(`/orgs/${cfg.activeOrgId}/parameters/values/${valueEntry.id}`, { value });
  if (!putRes.ok) {
    const body = await putRes.json().catch(() => ({})) as { message?: string };
    errorExit(body.message || `Error ${putRes.status}`);
  }

  process.stderr.write(`  ${GREEN('✓')} ${key} updated  (${DIM(app.name + ' · ' + env.name)})\n`);
}
