import type { MullClientOptions, LiveRef } from './types.js';
import type { SchemaField } from './schema.js';
import { MullClient } from './client.js';

export interface LiveConfigOptions extends MullClientOptions {
  schema: Record<string, SchemaField>;
}

// createConfig() — typed, schema-aware config proxy.
//
// Values are accessed via Proxy so each read fetches the current value from
// the in-memory cache. This means:
//
//   config.LOG_LEVEL          ← always up-to-date (reads cache on every access)
//   const x = config.LOG_LEVEL ← SNAPSHOT — x will NOT update after this line
//
// For always-live access to a primitive, use:
//   config.ref("LOG_LEVEL").value
//
// Example:
//   const config = createConfig({
//     token: process.env.VEXTIS_TOKEN,
//     project: "payments-api",
//     env: "production",
//     schema: {
//       DATABASE_URL: vextis.secret.string(),
//       LOG_LEVEL:    vextis.live.string().default("info"),
//       FEATURE_X:    vextis.live.boolean().default(false),
//     }
//   });
//   await config.init();
//   if (config.FEATURE_X) { ... }
export function createConfig<S extends Record<string, SchemaField>>(
  opts: Omit<LiveConfigOptions, 'schema'> & { schema: S }
): LiveConfigProxy<S> {
  const client = new MullClient({ ...opts, realtime: true });
  let initialized = false;

  const proxy = new Proxy({} as LiveConfigProxy<S>, {
    get(_, prop: string | symbol) {
      if (prop === 'init') {
        return async () => {
          await client.init();
          initialized = true;
        };
      }
      if (prop === 'ref') {
        return <T>(key: string): LiveRef<T> => client.ref<T>(key);
      }
      if (prop === 'on') return client.on.bind(client);
      if (prop === 'onKey') return client.onKey.bind(client);
      if (prop === 'connectionStatus') return client.connectionStatus;
      if (prop === 'disconnect') return client.disconnect.bind(client);
      if (prop === Symbol.toPrimitive || prop === 'valueOf') return undefined;
      if (typeof prop !== 'string') return undefined;

      const field = opts.schema[prop];
      const raw = client.get(prop);

      if (raw == null && field?.defaultValue !== undefined) return field.defaultValue;
      if (field?.type === 'boolean') {
        if (raw == null) return false;
        return typeof raw === 'boolean' ? raw : raw === 'true' || raw === '1';
      }
      if (field?.type === 'number') return raw == null ? 0 : Number(raw);
      return raw == null ? '' : String(raw);
    },
  });

  return proxy;
}

// Type helper: maps each schema field to its inferred TypeScript type
type FieldType<F extends SchemaField> =
  F['type'] extends 'boolean' ? boolean :
  F['type'] extends 'number' ? number :
  string;

export type LiveConfigProxy<S extends Record<string, SchemaField>> = {
  [K in keyof S]: FieldType<S[K]>;
} & {
  init(): Promise<void>;
  ref<T>(key: string): LiveRef<T>;
  on(event: 'change', handler: (key: string, newValue: unknown) => void): void;
  onKey<T>(key: string, handler: (newValue: T) => void): void;
  readonly connectionStatus: string;
  disconnect(): void;
};
