import { hostname, platform } from 'node:os';
import { clack, GREEN, DIM } from '../../lib/ui.ts';
import { loadConfig, saveConfig, addOrg } from '../../lib/config.ts';
import { errorExit } from '../../lib/errors.ts';
import { DEFAULT_API_URL } from '../../constants.ts';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const COUNTDOWN_UPDATE_MS = 30_000;

function remainingLabel(deadline: number): string {
  const secsLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  const m = Math.floor(secsLeft / 60);
  const s = String(secsLeft % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export async function loginCommand(): Promise<void> {
  clack.intro(GREEN('vextis auth login'));

  const existingConfig = loadConfig();
  const apiUrl = existingConfig?.apiUrl ?? DEFAULT_API_URL;

  const deviceName = hostname();
  const activeOrgId = existingConfig?.activeOrgId;
  const previousToken = activeOrgId ? (existingConfig?.orgs?.[activeOrgId]?.token ?? null) : null;
  const hadPreviousSession = Boolean(previousToken);

  if (hadPreviousSession) {
    clack.log.info(`A session already exists for this device. Completing login will revoke it.`);
  }

  const spinner = clack.spinner();
  spinner.start('Starting authentication…');

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
      errorExit(body.message || `Server error (${res.status})`, 'is the server running?');
    }
    const data = await res.json() as { id: string; deviceCode: string; verificationUrl: string };
    deviceId = data.id;
    deviceCode = data.deviceCode;
    verificationUrl = data.verificationUrl;
  } catch {
    spinner.stop('Failed.');
    errorExit(`Could not reach ${apiUrl}.`, 'check your connection or run: vextis doctor');
  }

  spinner.stop('Ready.');

  // Open browser with visible URL fallback
  let browserOpened = false;
  try {
    const { default: open } = await import('open');
    await open(verificationUrl);
    browserOpened = true;
    clack.log.info(`Browser opened: ${DIM(verificationUrl)}`);
  } catch {
    // handled below
  }

  if (!browserOpened) {
    clack.log.warn('Could not open browser automatically.');
    process.stderr.write(`\n  Open this URL in your browser:\n\n  ${GREEN(verificationUrl)}\n\n`);
  }

  // Poll with countdown
  const pollSpinner = clack.spinner();
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let approved = false;
  let lastCountdownUpdate = Date.now();

  pollSpinner.start(`Waiting for browser authorization…  ${DIM('Ctrl+C to cancel')}  (${remainingLabel(deadline)})`);

  while (Date.now() < deadline) {
    await Bun.sleep(POLL_INTERVAL_MS);

    if (Date.now() - lastCountdownUpdate >= COUNTDOWN_UPDATE_MS) {
      pollSpinner.message(`Waiting for browser authorization…  ${DIM('Ctrl+C to cancel')}  (${remainingLabel(deadline)})`);
      lastCountdownUpdate = Date.now();
    }

    try {
      const res = await fetch(
        `${apiUrl}/cli/device-code/${deviceId}/status?secret=${encodeURIComponent(deviceCode)}`
      );

      if (res.status === 404) {
        pollSpinner.stop('Session not found.');
        errorExit('Session expired or already used.', 'run: vextis auth login');
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
        errorExit('Authorization link expired.', 'run: vextis auth login');
      }

      if (data.status === 'approved' && data.token && data.orgId && data.email) {
        pollSpinner.stop('Authorized.');
        const existing = loadConfig();
        const cfg = addOrg(existing, data.orgId, { token: data.token, name: data.orgName ?? data.orgId }, data.email, apiUrl);
        saveConfig(cfg);

        process.stderr.write('\n');
        clack.log.success(`Logged in as ${GREEN(data.email)}`);
        clack.log.success(`Active org: ${GREEN(data.orgName ?? data.orgId)}`);
        process.stderr.write(`  ${DIM('↳')}  Session saved to ${DIM('~/.vextis/config.json')} ${DIM('(chmod 600)')}\n`);
        if (hadPreviousSession) {
          process.stderr.write(`  ${DIM('↳')}  Previous CLI session revoked.\n`);
        }
        process.stderr.write('\n');
        clack.outro('Try: vextis run -- npm run dev');
        approved = true;
        break;
      }
    } catch {
      // network hiccup — keep polling
    }
  }

  if (!approved) {
    pollSpinner.stop('Timed out.');
    errorExit('Timed out waiting for browser authorization.', 'run: vextis auth login');
  }
}
