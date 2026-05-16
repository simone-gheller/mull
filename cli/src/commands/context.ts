import { DIM, GREEN, formatTable } from '../lib/ui.ts';
import { loadConfig } from '../lib/config.ts';
import { parseFlags } from '../lib/flags.ts';
import { isJsonMode, printJson } from '../lib/output.ts';
import { loadLocalConfig } from '../lib/localConfig.ts';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function contextCommand(args: string[] = []): void {
  const { flags } = parseFlags(args);
  const cfg = loadConfig();
  const localCfg = loadLocalConfig();

  const globalPath = join(homedir(), '.vextis', 'config.json');
  const localPath = '.vextis/config.json';

  const orgId = cfg?.activeOrgId;
  const orgName = orgId ? (cfg?.orgs[orgId]?.name ?? orgId) : null;
  const appName = localCfg?.project ?? null;
  const envName = localCfg?.env ?? null;

  if (isJsonMode(flags)) {
    printJson({
      org: orgName ? { id: orgId, name: orgName } : null,
      app: appName,
      env: envName,
    });
    return;
  }

  const rows: [string, string][] = [];

  if (orgName) {
    rows.push(['org', `${GREEN(orgName)}  ${DIM(globalPath)}`]);
  } else {
    rows.push(['org', `${DIM('—')}  ${DIM('→ run: vextis auth login')}`]);
  }

  if (appName) {
    rows.push(['app', `${GREEN(appName)}  ${DIM(localPath)}`]);
  } else {
    rows.push(['app', `${DIM('—')}  ${DIM('→ run: vextis link')}`]);
  }

  if (envName) {
    rows.push(['env', `${GREEN(envName)}  ${DIM(localPath)}`]);
  } else {
    rows.push(['env', `${DIM('—')}  ${DIM('→ run: vextis env use <name>')}`]);
  }

  console.log('\n' + formatTable(rows) + '\n');
}
