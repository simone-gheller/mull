import { clack } from './ui.ts';
import { apiGet } from './api.ts';
import { notFound, errorExit } from './errors.ts';
import { isTTY } from './output.ts';

export interface AppItem {
  id: string;
  name: string;
  depth: number;
  ancestors: string[];
  _count?: { parameters: number };
}

export interface EnvItem {
  id: string;
  name: string;
  tier: string;
  protected: boolean;
}

export async function resolveApp(orgId: string, name: string): Promise<AppItem> {
  const res = await apiGet(`/orgs/${orgId}/apps`);
  if (!res.ok) errorExit(`Failed to fetch apps (${res.status})`);
  const apps = await res.json() as AppItem[];
  const match = apps.find(a => a.name.toLowerCase() === name.toLowerCase());
  if (!match) notFound('app', name, 'run: vextis apps');
  return match;
}

export async function resolveEnv(orgId: string, name: string): Promise<EnvItem> {
  const res = await apiGet(`/orgs/${orgId}/environments`);
  if (!res.ok) errorExit(`Failed to fetch environments (${res.status})`);
  const envs = await res.json() as EnvItem[];
  const match = envs.find(e => e.name.toLowerCase() === name.toLowerCase());
  if (!match) notFound('environment', name, 'run: vextis envs');
  return match;
}

// Resolve app by name, or show interactive picker if name is not provided (TTY only)
export async function resolveAppInteractive(orgId: string, name?: string): Promise<AppItem> {
  const res = await apiGet(`/orgs/${orgId}/apps`);
  if (!res.ok) errorExit(`Failed to fetch apps (${res.status})`);
  const apps = await res.json() as AppItem[];

  if (name) {
    const match = apps.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (!match) notFound('app', name, 'run: vextis apps');
    return match;
  }

  if (!isTTY()) {
    errorExit('--app <name> is required in non-interactive mode.', 'or run: vextis link', 2);
  }

  if (apps.length === 0) errorExit('No apps found in this org.', 'create an app in the dashboard first');

  const selected = await clack.select({
    message: 'Select app:',
    options: apps.map(a => ({ value: a.name, label: '  '.repeat(a.depth) + a.name })),
  });
  if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }
  const match = apps.find(a => a.name === selected)!;
  return match;
}

// Resolve env by name, or show interactive picker if name is not provided (TTY only)
export async function resolveEnvInteractive(orgId: string, name?: string): Promise<EnvItem> {
  const res = await apiGet(`/orgs/${orgId}/environments`);
  if (!res.ok) errorExit(`Failed to fetch environments (${res.status})`);
  const envs = await res.json() as EnvItem[];

  if (name) {
    const match = envs.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (!match) notFound('environment', name, 'run: vextis envs');
    return match;
  }

  if (!isTTY()) {
    errorExit('--env <name> is required in non-interactive mode.', 'or run: vextis env use <name>', 2);
  }

  if (envs.length === 0) errorExit('No environments found in this org.');

  const selected = await clack.select({
    message: 'Select environment:',
    options: envs.map(e => ({ value: e.name, label: e.name + (e.protected ? '  ! protected' : '') })),
  });
  if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }
  const match = envs.find(e => e.name === selected)!;
  return match;
}
