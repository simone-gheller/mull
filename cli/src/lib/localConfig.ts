// Project-level config at .vextis/config.json (gitignored).
// Stores the active project and environment for `vextis run`, `vextis config get/set`, etc.
// Distinct from the global auth config at ~/.vextis/config.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface LocalConfig {
  project: string;
  env: string;
}

const LOCAL_DIR = '.vextis';
const LOCAL_PATH = join(LOCAL_DIR, 'config.json');

export function loadLocalConfig(): LocalConfig | null {
  if (!existsSync(LOCAL_PATH)) return null;
  try {
    return JSON.parse(readFileSync(LOCAL_PATH, 'utf-8')) as LocalConfig;
  } catch {
    return null;
  }
}

export function saveLocalConfig(cfg: LocalConfig): void {
  if (!existsSync(LOCAL_DIR)) mkdirSync(LOCAL_DIR, { recursive: true });
  writeFileSync(LOCAL_PATH, JSON.stringify(cfg, null, 2) + '\n', 'utf-8');
}

export function localConfigPath(): string {
  return LOCAL_PATH;
}
