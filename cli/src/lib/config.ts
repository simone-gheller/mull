import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, chmodSync, writeFileSync, readFileSync } from 'node:fs';

export interface OrgEntry {
  token: string;
  name: string;
}

export interface MullConfig {
  apiUrl: string;
  email: string;
  orgs: Record<string, OrgEntry>;
  activeOrgId: string;
}

const CONFIG_DIR = join(homedir(), '.mull');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export function loadConfig(): MullConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

export function requireConfig(): MullConfig {
  const cfg = loadConfig();
  if (!cfg) {
    console.error('Not logged in. Run: mull auth login');
    process.exit(1);
  }
  return cfg;
}

export function saveConfig(cfg: MullConfig): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  chmodSync(CONFIG_PATH, 0o600);
}

export function addOrg(cfg: MullConfig | null, orgId: string, entry: OrgEntry, email: string, apiUrl: string): MullConfig {
  return {
    apiUrl,
    email,
    orgs: { ...(cfg?.orgs ?? {}), [orgId]: entry },
    activeOrgId: orgId,
  };
}

export function activeToken(cfg: MullConfig): string | null {
  return cfg.orgs[cfg.activeOrgId]?.token ?? null;
}
