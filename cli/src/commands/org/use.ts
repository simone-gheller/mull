import { GREEN, DIM } from '../../lib/ui.ts';
import { loadConfig, saveConfig } from '../../lib/config.ts';
import { errorExit, notFound } from '../../lib/errors.ts';

export function orgUseCommand(args: string[]): void {
  const query = args[0];
  if (!query) errorExit('Usage: vextis org use <name-or-id>', undefined, 2);

  const cfg = loadConfig();
  if (!cfg || Object.keys(cfg.orgs).length === 0) {
    errorExit('Not logged in to any organization.', 'run: vextis auth login');
  }

  const q = query.toLowerCase();
  const match = Object.entries(cfg.orgs).find(([id, entry]) =>
    entry.name.toLowerCase() === q || id.toLowerCase().startsWith(q)
  );

  if (!match) {
    notFound('org', query, 'run: vextis org list');
  }

  const [orgId, orgEntry] = match;
  if (orgId === cfg.activeOrgId) {
    process.stderr.write(`  ${DIM('↳')}  ${orgEntry.name} is already the active org.\n`);
    return;
  }

  saveConfig({ ...cfg, activeOrgId: orgId });
  process.stderr.write(`  ${GREEN('✓')} Active org set to ${GREEN(orgEntry.name)}\n`);
}
