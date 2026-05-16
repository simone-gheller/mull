import type { ConnectionStatus, SSEConnectedEvent, SSEHeartbeatEvent, SSEConfigUpdatedEvent } from './types.js';
import { MullNetworkError } from './errors.js';

export interface SseCallbacks {
  onConnected: (event: SSEConnectedEvent) => void;
  onHeartbeat: (event: SSEHeartbeatEvent) => void;
  onConfigUpdated: (event: SSEConfigUpdatedEvent) => void;
  onStatusChange: (status: ConnectionStatus) => void;
}

// Simple SSE event parser. Buffer handles chunks split across read() calls.
function* parseSseChunks(buffer: string): Generator<{ event: string; data: string; id?: string }> {
  const rawEvents = buffer.split('\n\n');
  // Last element may be incomplete — caller should prepend it to the next chunk
  for (let i = 0; i < rawEvents.length - 1; i++) {
    const block = rawEvents[i].trim();
    if (!block) continue;
    let event = 'message', data = '', id: string | undefined;
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7);
      else if (line.startsWith('data: ')) data += line.slice(6);
      else if (line.startsWith('id: ')) id = line.slice(4);
    }
    if (data) yield { event, data, id };
  }
}

// Returns the trailing incomplete frame (everything after the last \n\n)
function trailingFragment(buffer: string): string {
  const idx = buffer.lastIndexOf('\n\n');
  return idx === -1 ? buffer : buffer.slice(idx + 2);
}

export class SseClient {
  private abortController: AbortController | null = null;
  connectionStatus: ConnectionStatus = 'disconnected';

  // heartbeatTimeoutMs: if no heartbeat received within this window, force reconnect
  constructor(
    private readonly url: string,
    private readonly headers: Record<string, string>,
    private readonly callbacks: SseCallbacks,
    private readonly heartbeatTimeoutMs = 60_000,
  ) {}

  // Connect with exponential backoff + jitter. Returns when disconnect() is called.
  async connect(lastVersion?: number): Promise<void> {
    let attempt = 0;

    while (!this.abortController?.signal.aborted) {
      this.abortController = new AbortController();
      const url = lastVersion !== undefined
        ? `${this.url}&lastVersion=${lastVersion}`
        : this.url;

      this.setStatus('reconnecting');
      try {
        const res = await fetch(url, {
          headers: { ...this.headers, Accept: 'text/event-stream' },
          signal: this.abortController.signal,
        });

        if (res.status === 401) throw new MullNetworkError('Unauthorized — check MULL_TOKEN');
        if (!res.ok) throw new MullNetworkError(`SSE connection failed: HTTP ${res.status}`);
        if (!res.body) throw new MullNetworkError('Response has no body');

        this.setStatus('connected');
        attempt = 0;

        // Stream read loop
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let heartbeatTimer = this.startHeartbeatTimeout();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            for (const { event, data } of parseSseChunks(buffer)) {
              clearTimeout(heartbeatTimer);
              heartbeatTimer = this.startHeartbeatTimeout();

              try {
                const parsed = JSON.parse(data);
                if (event === 'connected') {
                  this.callbacks.onConnected(parsed as SSEConnectedEvent);
                } else if (event === 'heartbeat') {
                  this.callbacks.onHeartbeat(parsed as SSEHeartbeatEvent);
                } else if (event === 'config.updated') {
                  const ev = parsed as SSEConfigUpdatedEvent;
                  lastVersion = ev.version;
                  this.callbacks.onConfigUpdated(ev);
                }
              } catch { /* malformed JSON — ignore */ }
            }

            buffer = trailingFragment(buffer);
          }
        } finally {
          clearTimeout(heartbeatTimer);
          reader.releaseLock();
        }

      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return; // intentional disconnect
        this.setStatus('degraded');
      }

      // Exponential backoff: 1s, 2s, 4s, 8s … max 30s, +jitter
      const base = Math.min(1000 * 2 ** attempt, 30_000);
      const jitter = Math.random() * 1000;
      attempt++;
      await sleep(base + jitter);
    }

    this.setStatus('disconnected');
  }

  disconnect(): void {
    this.abortController?.abort();
  }

  private setStatus(s: ConnectionStatus): void {
    if (this.connectionStatus !== s) {
      this.connectionStatus = s;
      this.callbacks.onStatusChange(s);
    }
  }

  private startHeartbeatTimeout(): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      // Heartbeat missing — force reconnect by aborting current fetch
      this.setStatus('degraded');
      this.abortController?.abort();
    }, this.heartbeatTimeoutMs);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
