import { GREEN, DIM, formatTable } from '../../lib/ui.ts';
import { requireConfig, activeToken } from '../../lib/config.ts';
import { apiGet } from '../../lib/api.ts';
import { parseFlags } from '../../lib/flags.ts';
import { isJsonMode, printJson } from '../../lib/output.ts';
import { errorExit } from '../../lib/errors.ts';

interface WhoamiResponse {
  identityType: string;
  identityName: string;
  credentialType: string;
  credentialId?: string;
  credentialPrefix?: string;
  orgId: string | null;
  orgRole: string | null;
  scopes: string[];
  email?: string;
  expiresAt?: string;
}

export async function whoamiCommand(args: string[] = []): Promise<void> {
  const { flags } = parseFlags(args);
  const cfg = requireConfig();
  const token = activeToken(cfg);
  if (!token) {
    errorExit('No active org token.', 'run: vextis auth login');
  }

  const res = await apiGet('/auth/whoami');
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    errorExit(body.message || `Error ${res.status}`);
  }

  const data = await res.json() as WhoamiResponse;
  const orgEntry = cfg.orgs[cfg.activeOrgId];

  if (isJsonMode(flags)) {
    printJson({
      email: cfg.email,
      org: { id: cfg.activeOrgId, name: orgEntry?.name ?? cfg.activeOrgId },
      role: data.orgRole,
      credentialType: data.credentialType,
      credentialPrefix: data.credentialPrefix ?? null,
      scopes: data.scopes,
      expiresAt: data.expiresAt ?? null,
    });
    return;
  }

  const credLabel = data.credentialPrefix
    ? `${data.credentialType}  ${DIM(data.credentialPrefix + '…')}`
    : DIM(data.credentialType);

  const rows: [string, string][] = [
    ['email', GREEN(cfg.email)],
    ['org', GREEN(orgEntry?.name ?? cfg.activeOrgId)],
    ['role', data.orgRole ?? DIM('—')],
    ['credential', credLabel],
    ['scopes', DIM(`${data.scopes.length} scopes`)],
  ];

  if (data.expiresAt) {
    const expiresMs = new Date(data.expiresAt).getTime() - Date.now();
    const days = Math.max(0, Math.ceil(expiresMs / 86_400_000));
    rows.push(['expires', DIM(`in ${days} days`)]);
  }

  console.log('\n' + formatTable(rows) + '\n');
}
