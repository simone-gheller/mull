import type { ConfigSnapshot, ConfigDelta, ConfigMeta } from './types.js';

// In-memory config cache. Reads are sync after init().
// Updates are atomic (JS single-threaded — no lock needed).
export class ConfigCache {
  version = 0;
  private values = new Map<string, unknown>();
  private meta = new Map<string, ConfigMeta>();

  update(snapshot: ConfigSnapshot): void {
    this.version = snapshot.version;
    this.values.clear();
    this.meta.clear();
    for (const [k, v] of Object.entries(snapshot.values)) {
      this.values.set(k, v);
    }
    for (const [k, m] of Object.entries(snapshot.meta ?? {})) {
      this.meta.set(k, m);
    }
  }

  // Merge a delta: only the changed keys are updated, version advances.
  applyDelta(delta: ConfigDelta): string[] {
    if (delta.version <= this.version) return []; // already seen
    const changed: string[] = [];
    for (const [k, v] of Object.entries(delta.values)) {
      const prev = this.values.get(k);
      if (prev !== v) {
        this.values.set(k, v);
        changed.push(k);
      }
    }
    this.version = delta.version;
    return changed;
  }

  get(key: string): unknown {
    return this.values.get(key);
  }

  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.values);
  }

  getMeta(key: string): ConfigMeta | undefined {
    return this.meta.get(key);
  }

  has(key: string): boolean {
    return this.values.has(key);
  }
}
