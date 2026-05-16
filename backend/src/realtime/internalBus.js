import { EventEmitter } from 'node:events';

// Singleton event bus between the Supabase Realtime subscriber and SSE route handlers.
// The subscriber emits 'config.updated' events here; clientRegistry fans them out
// only to SSE connections matching the same org:app:env routing key.
export const internalBus = new EventEmitter();
internalBus.setMaxListeners(0); // unbounded: one listener per SSE connection
