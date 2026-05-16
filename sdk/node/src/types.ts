export interface MullClientOptions {
  token: string;
  project: string;
  env: string;
  /** Override API base URL (default: https://api.vextis.io) */
  apiUrl?: string;
  /** Enable SSE realtime updates (default: false) */
  realtime?: boolean;
  /** Org UUID — required when using a PAT without an app binding */
  org?: string;
}

export interface ConfigMeta {
  live: boolean;
  secret: boolean;
  type: 'string' | 'boolean' | 'number';
}

export interface ConfigSnapshot {
  appId: string;
  environment: string;
  version: number;
  values: Record<string, unknown>;
  meta: Record<string, ConfigMeta>;
}

export interface ConfigDelta {
  appId: string;
  environment: string;
  fromVersion: number;
  version: number;
  values: Record<string, unknown>;
  changedKeys: string[];
}

export interface SSEConnectedEvent {
  latestVersion: number;
}

export interface SSEHeartbeatEvent {
  latestVersion: number;
  serverTime: string;
}

export interface SSEConfigUpdatedEvent {
  version: number;
  changedKeys: string[];
  reason?: string;
}

export type ConnectionStatus = 'connected' | 'degraded' | 'reconnecting' | 'disconnected';

export interface LiveRef<T> {
  readonly value: T;
}

export type ChangeHandler = (key: string, newValue: unknown, oldValue: unknown) => void;
