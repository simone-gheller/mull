import { clack, GREEN, DIM, fail } from '../../lib/ui.ts';
import { loadConfig, saveConfig } from '../../lib/config.ts';

export async function logoutCommand(args: string[]): Promise<void> {
  const all = args.includes('--all');
  const cfg = loadConfig();

  if (!cfg || Object.keys(cfg.orgs).length === 0) {
    clack.log.info('Not logged in.');
    return;
  }

  if (all) {
    saveConfig({ ...cfg, orgs: {}, activeOrgId: '' });
    clack.log.success('Logged out from all organizations.');
    return;
  }

  const activeOrgId = cfg.activeOrgId;
  const orgName = cfg.orgs[activeOrgId]?.name ?? activeOrgId;

  if (!cfg.orgs[activeOrgId]) {
    fail('No active org session found. Use --all to clear everything.');
  }

  const remaining = { ...cfg.orgs };
  delete remaining[activeOrgId];

  const remainingIds = Object.keys(remaining);
  const nextOrgId = remainingIds[0] ?? '';

  saveConfig({ ...cfg, orgs: remaining, activeOrgId: nextOrgId });

  clack.log.success(`Logged out from ${GREEN(orgName)}.`);
  if (nextOrgId) {
    clack.log.info(`Active org switched to: ${DIM(remaining[nextOrgId].name)}`);
  }
}
