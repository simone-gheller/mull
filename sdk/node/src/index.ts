// @vextis/sdk — vextis config SDK for Node.js
// Node.js 18+ required (fetch + ReadableStream built-in)
export { MullClient } from './client.js';
export { createConfig } from './liveConfig.js';
export { ConfigCache } from './cache.js';
export { schema } from './schema.js';
export * from './errors.js';
export type {
  MullClientOptions,
  ConfigSnapshot,
  ConfigDelta,
  ConnectionStatus,
  LiveRef,
  ChangeHandler,
  ConfigMeta,
} from './types.js';
export type { SchemaField } from './schema.js';
export type { LiveConfigProxy } from './liveConfig.js';

import type { MullClientOptions } from './types.js';
import { MullClient } from './client.js';
import { schema } from './schema.js';

export interface InjectOptions {
  token: string;
  project: string;
  env: string;
  apiUrl?: string;
  org?: string;
}

// vextis.inject() — simplest adoption path.
// Fetches config once and injects values into process.env.
// Compatible with dotenv, envalid, zod, Fastify env, Nest ConfigModule, etc.
// Does NOT enable realtime updates — use createConfig() for that.
async function inject(opts: InjectOptions): Promise<void> {
  const client = await MullClient.connect({ ...opts, realtime: false });
  const all = client.getAll();
  for (const [k, v] of Object.entries(all)) {
    if (v !== null && v !== undefined) {
      process.env[k] = String(v);
    }
  }
  client.disconnect();
}

// Top-level vextis object — the primary API surface
export const vextis = {
  inject,
  live: schema.live,
  secret: schema.secret,
};
