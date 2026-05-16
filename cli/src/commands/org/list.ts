import { DIM, GREEN } from '../../lib/ui.ts';
import { loadConfig } from '../../lib/config.ts';
import { parseFlags } from '../../lib/flags.ts';
import { isJsonMode, printJson } from '../../lib/output.ts';
import { errorExit } from '../../lib/errors.ts';

export function orgListCommand(args: string[] = []): void {
  const { flags } = parseFlags(args);
  const cfg = loadConfig();

  if (!cfg || Object.keys(cfg.orgs).length === 0) {
    errorExit('Not logged in to any organization.', 'run: vextis auth login');
  }

  const orgs = Object.entries(cfg.orgs).map(([id, entry]) => ({
    id,
    name: entry.name,
    active: id === cfg.activeOrgId,
  }));

  if (isJsonMode(flags)) {
    printJson(orgs);
    return;
  }

  const maxName = Math.max(...orgs.map(o => o.name.length));
  process.stderr.write('\n');
  for (const o of orgs) {
    const marker = o.active ? GREEN('▸') : ' ';
    const namePadded = o.name.padEnd(maxName);
    const statusPart = o.active ? DIM('(active)') : '';
    process.stdout.write(`  ${marker} ${namePadded}  ${statusPart}\n`);
  }
  process.stderr.write(`\n  ${DIM('↳ to add another org: vextis auth login')}\n\n`);
}
