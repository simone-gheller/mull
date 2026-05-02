import fp from 'fastify-plugin'
import { createClient } from '@supabase/supabase-js'

export default fp(async function(fastify) {
  fastify.decorate('supabaseAnon', createClient(
    fastify.config.SUPABASE_URL,
    fastify.config.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,   // ← nessun timer in background
        persistSession: false,     // ← nessuno stato interno di sessione
        detectSessionInUrl: false  // ← siamo server-side, non ha senso
      }
    }
  ))
}, { name: 'supabase-plugin' })