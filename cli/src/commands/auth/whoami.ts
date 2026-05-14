import { clack, GREEN, DIM, formatTable } from '../../lib/ui.ts';
import { requireConfig, activeToken } from '../../lib/config.ts';
import { apiGet } from '../../lib/api.ts';

interface WhoamiResponse {
  identityType: string;
  identityName: string;
  credentialType: string;
  orgId: string | null;
  orgRole: string | null;
  scopes: string[];
  email?: string;
}

export async function whoamiCommand(): Promise<void> {
  const cfg = requireConfig();
  const token = activeToken(cfg);
  if (!token) {
    clack.log.error('No active org token. Run: mull auth login');
    process.exit(1);
  }

  const res = await apiGet('/auth/whoami');
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    clack.log.error(body.message || `Error ${res.status}`);
    process.exit(1);
  }

  const data = await res.json() as WhoamiResponse;
  const orgEntry = cfg.orgs[cfg.activeOrgId];

  console.log('\n' + formatTable([
    ['email', GREEN(cfg.email)],
    ['org', GREEN(orgEntry?.name ?? cfg.activeOrgId)],
    ['role', data.orgRole ?? DIM('—')],
    ['credential', DIM(data.credentialType)],
    ['scopes', DIM(`${data.scopes.length} scopes`)],
  ]) + '\n');
}
