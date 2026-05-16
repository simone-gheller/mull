import { hostname, platform } from 'node:os';
import { clack, GREEN, DIM, RED, fail } from '../../lib/ui.ts';
import { loadConfig, saveConfig, addOrg } from '../../lib/config.ts';
import { DEFAULT_API_URL, DEFAULT_APP_URL } from '../../constants.ts';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export async function loginCommand(): Promise<void> {
  clack.intro(GREEN('vextis auth login'));

  const existingConfig = loadConfig();
  const apiUrl = existingConfig?.apiUrl ?? DEFAULT_API_URL;
  const appUrl = DEFAULT_APP_URL;

  const deviceName = hostname();
  const activeOrgId = existingConfig?.activeOrgId;
  const previousToken = activeOrgId ? (existingConfig?.orgs?.[activeOrgId]?.token ?? null) : null;

  const spinner = clack.spinner();
  spinner.start('Starting authentication…');

  // 1. Request device code
  let deviceId: string;
  let deviceCode: string;
  let verificationUrl: string;

  try {
    const res = await fetch(`${apiUrl}/cli/device-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceName, platform: platform(), ...(previousToken ? { previousToken } : {}) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      spinner.stop('Failed.');
      fail(body.message || `Server error (${res.status})`);
    }
    const data = await res.json() as { id: string; deviceCode: string; verificationUrl: string };
    deviceId = data.id;
    deviceCode = data.deviceCode;
    verificationUrl = data.verificationUrl;
  } catch (err) {
    spinner.stop('Failed.');
    fail(`Could not reach ${apiUrl}. Is the server running?`);
  }

  spinner.stop('Ready.');

  // 2. Open browser
  try {
    const { default: open } = await import('open');
    await open(verificationUrl);
    clack.log.info(`Browser opened: ${DIM(verificationUrl)}`);
  } catch {
    clack.log.warn(`Could not open browser. Open this URL manually:\n  ${verificationUrl}`);
  }

  // 3. Poll for approval
  const pollSpinner = clack.spinner();
  pollSpinner.start('Waiting for browser authorization… (Ctrl+C to cancel)');

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let approved = false;

  while (Date.now() < deadline) {
    await Bun.sleep(POLL_INTERVAL_MS);

    try {
      const res = await fetch(
        `${apiUrl}/cli/device-code/${deviceId}/status?secret=${encodeURIComponent(deviceCode)}`
      );

      if (res.status === 404) {
        pollSpinner.stop('Session expired or already used.');
        fail('Session expired. Run vextis auth login again.');
      }

      if (!res.ok) continue;

      const data = await res.json() as {
        status: 'pending' | 'approved' | 'expired';
        token?: string;
        orgId?: string;
        orgName?: string;
        email?: string;
      };

      if (data.status === 'expired') {
        pollSpinner.stop('Expired.');
        fail('Authorization link expired. Run vextis auth login again.');
      }

      if (data.status === 'approved' && data.token && data.orgId && data.email) {
        pollSpinner.stop('Authorized.');
        const existing = loadConfig();
        const cfg = addOrg(existing, data.orgId, { token: data.token, name: data.orgName ?? data.orgId }, data.email, apiUrl);
        saveConfig(cfg);
        clack.log.success(`Logged in as ${GREEN(data.email)}`);
        clack.log.success(`Active org: ${GREEN(data.orgName ?? data.orgId)}`);
        clack.outro('You\'re all set. Try: vextis auth whoami');
        approved = true;
        break;
      }
    } catch {
      // network hiccup — keep polling
    }
  }

  if (!approved) {
    pollSpinner.stop('Timed out.');
    fail('Timed out waiting for browser authorization.');
  }
}
