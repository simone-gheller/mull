import { apiGet } from './api.ts';
import { fail } from './ui.ts';

interface AppItem {
  id: string;
  name: string;
  depth: number;
  ancestors: string[];
  _count?: { parameters: number };
}

interface EnvItem {
  id: string;
  name: string;
  tier: string;
  protected: boolean;
}

export async function resolveApp(orgId: string, name: string): Promise<AppItem> {
  const res = await apiGet(`/orgs/${orgId}/apps`);
  if (!res.ok) fail(`Failed to fetch apps (${res.status})`);
  const apps = await res.json() as AppItem[];
  const match = apps.find(a => a.name.toLowerCase() === name.toLowerCase());
  if (!match) fail(`App '${name}' not found. Run: vextis apps`);
  return match;
}

export async function resolveEnv(orgId: string, name: string): Promise<EnvItem> {
  const res = await apiGet(`/orgs/${orgId}/environments`);
  if (!res.ok) fail(`Failed to fetch environments (${res.status})`);
  const envs = await res.json() as EnvItem[];
  const match = envs.find(e => e.name.toLowerCase() === name.toLowerCase());
  if (!match) fail(`Environment '${name}' not found. Run: vextis envs`);
  return match;
}
