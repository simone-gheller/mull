import { EventEmitter } from 'node:events';
import type { MullClientOptions, ConfigSnapshot, ConfigDelta, ConnectionStatus, LiveRef, ChangeHandler } from './types.js';
import { ConfigCache } from './cache.js';
import { SseClient } from './sse.js';
import { MullAuthError, MullNetworkError, MullConfigError } from './errors.js';

const DEFAULT_API_URL = 'https://api.vextis.io';

// Low-level vextis client. Prefer createConfig() or vextis.inject() for most use cases.
export class MullClient extends EventEmitter {
  private readonly opts: Required<MullClientOptions>;
  private readonly cache = new ConfigCache();
  private sse: SseClient | null = null;
  connectionStatus: ConnectionStatus = 'disconnected';

  private constructor(opts: MullClientOptions) {
    super();
    this.opts = {
      apiUrl: opts.apiUrl ?? DEFAULT_API_URL,
      realtime: opts.realtime ?? false,
      org: opts.org ?? '',
      ...opts,
    };
  }

  // Fetch initial snapshot and optionally open SSE for realtime updates.
  static async connect(opts: MullClientOptions): Promise<MullClient> {
    const client = new MullClient(opts);
    await client.init();
    return client;
  }

  async init(): Promise<void> {
    const snapshot = await this.fetchSnapshot();
    this.cache.update(snapshot);

    if (this.opts.realtime) {
      this.openSse(snapshot.version);
    }
  }

  // -------------------------------------------------------------------------
  // Sync accessors (safe to call in hot paths after init())
  // -------------------------------------------------------------------------

  get<T = unknown>(key: string): T {
    return this.cache.get(key) as T;
  }

  string(key: string): string {
    const v = this.cache.get(key);
    return v == null ? '' : String(v);
  }

  boolean(key: string): boolean {
    const v = this.cache.get(key);
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v === 'true' || v === '1';
    return Boolean(v);
  }

  number(key: string): number {
    return Number(this.cache.get(key) ?? 0);
  }

  // Returns a live reference: .value re-reads from cache on every access.
  // Use this instead of `const X = client.get("X")` to avoid primitive snapshots.
  ref<T = unknown>(key: string): LiveRef<T> {
    const cache = this.cache;
    return {
      get value(): T {
        return cache.get(key) as T;
      },
    };
  }

  // Subscribe to all key changes
  on(event: 'change', handler: ChangeHandler): this;
  on(event: string, handler: (...args: unknown[]) => void): this;
  on(event: string, handler: (...args: unknown[]) => void): this {
    return super.on(event, handler);
  }

  // Subscribe to changes for a specific key
  onKey<T = unknown>(key: string, handler: (newValue: T, oldValue: T) => void): this {
    return super.on(`key:${key}`, handler);
  }

  getAll(): Record<string, unknown> {
    return this.cache.getAll();
  }

  get version(): number {
    return this.cache.version;
  }

  disconnect(): void {
    this.sse?.disconnect();
    this.sse = null;
    this.connectionStatus = 'disconnected';
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private buildConfigUrl(params: Record<string, string | number | undefined>): string {
    const qs = new URLSearchParams();
    qs.set('project', this.opts.project);
    qs.set('env', this.opts.env);
    if (this.opts.org) qs.set('org', this.opts.org);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    return `${this.opts.apiUrl}/v1/config?${qs}`;
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.opts.token}` };
  }

  private async fetchSnapshot(): Promise<ConfigSnapshot> {
    const res = await fetch(this.buildConfigUrl({}), {
      headers: this.authHeaders(),
    });
    if (res.status === 401) throw new MullAuthError();
    if (res.status === 404) throw new MullConfigError('App or environment not found');
    if (!res.ok) throw new MullNetworkError(`Config fetch failed: HTTP ${res.status}`);
    return res.json() as Promise<ConfigSnapshot>;
  }

  private async fetchDelta(sinceVersion: number): Promise<ConfigDelta> {
    const res = await fetch(this.buildConfigUrl({ sinceVersion }), {
      headers: this.authHeaders(),
    });
    if (!res.ok) throw new MullNetworkError(`Delta fetch failed: HTTP ${res.status}`);
    return res.json() as Promise<ConfigDelta>;
  }

  private openSse(initialVersion: number): void {
    const sseUrl = this.buildConfigUrl({}).replace('/v1/config?', '/v1/config/events?');
    this.sse = new SseClient(sseUrl, this.authHeaders(), {
      onConnected: ({ latestVersion }) => {
        if (latestVersion > this.cache.version) {
          // Already handled by catch-up event from server
        }
      },
      onHeartbeat: () => { /* connection is alive — no action needed */ },
      onConfigUpdated: async (ev) => {
        if (ev.version <= this.cache.version) return; // already applied
        try {
          const delta = await this.fetchDelta(this.cache.version);
          const changed = this.cache.applyDelta(delta);
          for (const key of changed) {
            const newVal = this.cache.get(key);
            this.emit('key:' + key, newVal, undefined);
            this.emit('change', key, newVal, undefined);
          }
        } catch { /* keep last-known-good cache on fetch failure */ }
      },
      onStatusChange: (status) => {
        this.connectionStatus = status;
        this.emit('statusChange', status);
      },
    });

    this.sse.connect(initialVersion).catch(() => { /* reconnect loop handles errors */ });
  }
}
