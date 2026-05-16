import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, chmodSync, writeFileSync, readFileSync } from 'node:fs';

export interface OrgEntry {
  token: string;
  name: string;
}

export interface VextisConfig {
  apiUrl: string;
  email: string;
  orgs: Record<string, OrgEntry>;
  activeOrgId: string;
}

const CONFIG_DIR = join(homedir(), '.vextis');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export function loadConfig(): VextisConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

export function requireConfig(): VextisConfig {
  const cfg = loadConfig();
  if (!cfg) {
    // Import inline to avoid circular dependency at module load time
    process.stderr.write(`\n  \x1b[31m✗\x1b[0m  Not logged in.\n  \x1b[2m›\x1b[0m  run: vextis auth login\n\n`);
    process.exit(1);
  }
  return cfg;
}

export function saveConfig(cfg: VextisConfig): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  chmodSync(CONFIG_PATH, 0o600);
}

export function addOrg(cfg: VextisConfig | null, orgId: string, entry: OrgEntry, email: string, apiUrl: string): VextisConfig {
  return {
    apiUrl,
    email,
    orgs: { ...(cfg?.orgs ?? {}), [orgId]: entry },
    activeOrgId: orgId,
  };
}

export function activeToken(cfg: VextisConfig): string | null {
  return cfg.orgs[cfg.activeOrgId]?.token ?? null;
}
