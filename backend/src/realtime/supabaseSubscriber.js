// Supabase Realtime subscriber for config_events.
// Isolates Supabase from the rest of the realtime pipeline — swap with
// Postgres LISTEN/NOTIFY or Redis Pub/Sub without touching SDK protocol.
import { createClient } from '@supabase/supabase-js';
import { internalBus } from './internalBus.js';

let supabase = null;
let channel = null;

export function startSubscriber(supabaseUrl, supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  channel = supabase
    .channel('mull-config-events')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'config_events' },
      (payload) => {
        const row = payload.new;
        if (!row) return;

        // Normalize DB row → stable internal event shape
        internalBus.emit('config.updated', {
          type: 'config.updated',
          orgId: row.org_id,
          appId: row.app_id,
          environmentId: row.environment_id,
          version: Number(row.version),
          changedKeys: row.changed_keys ?? [],
          createdAt: row.created_at,
        });
      }
    )
    .subscribe((status, err) => {
      if (err) console.error('[supabaseSubscriber] subscribe error', err);
      else console.info('[supabaseSubscriber] status:', status);
    });

  return channel;
}

export async function stopSubscriber() {
  if (channel) {
    await supabase.removeChannel(channel);
    channel = null;
  }
}
