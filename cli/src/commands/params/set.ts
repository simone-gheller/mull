import { clack, GREEN, DIM, fail } from '../../lib/ui.ts';
import { requireConfig } from '../../lib/config.ts';
import { apiGet, apiPut } from '../../lib/api.ts';
import { parseFlags } from '../../lib/flags.ts';
import { resolveApp, resolveEnv } from '../../lib/resolve.ts';

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
  if (!key) fail('Key is required. Example: mull params set MY_KEY --app myapp --env prod');
  if (!flags.app) fail('--app <name> is required');
  if (!flags.env) fail('--env <name> is required');

  const cfg = requireConfig();
  const [app, env] = await Promise.all([
    resolveApp(cfg.activeOrgId, flags.app),
    resolveEnv(cfg.activeOrgId, flags.env),
  ]);

  const valRes = await apiGet(`/orgs/${cfg.activeOrgId}/parameters/${app.id}/values`);
  if (!valRes.ok) {
    const body = await valRes.json().catch(() => ({})) as { message?: string };
    fail(body.message || `Error ${valRes.status}`);
  }

  const valData = await valRes.json() as ValuesResponse;
  const envEntry = Object.values(valData).find(e => e.environmentId === env.id);
  if (!envEntry) fail(`No parameter values found for environment '${flags.env}'`);

  const valueEntry = envEntry.values.find(v => v.parameterKey === key);
  if (!valueEntry) fail(`Parameter '${key}' not found in app '${flags.app}'. Run: mull params list --app ${flags.app}`);

  const value = await clack.password({
    message: `Value for ${GREEN(key)} in ${DIM(flags.env)}:`,
  });

  if (clack.isCancel(value)) {
    clack.cancel('Cancelled.');
    process.exit(0);
  }

  const putRes = await apiPut(`/orgs/${cfg.activeOrgId}/parameters/values/${valueEntry.id}`, { value });
  if (!putRes.ok) {
    const body = await putRes.json().catch(() => ({})) as { message?: string };
    fail(body.message || `Error ${putRes.status}`);
  }

  clack.outro(`${GREEN(key)} updated in ${DIM(flags.env)}`);
}
