import fp from 'fastify-plugin'
import { createClient } from '@supabase/supabase-js'

export default fp(async function(fastify) {
  fastify.decorate('supabaseAnon', createClient(
    fastify.config.SUPABASE_URL,
    fastify.config.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  ))

  fastify.decorate('supabaseAdmin', createClient(
    fastify.config.SUPABASE_URL,
    fastify.config.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  ))
}, { name: 'supabase-plugin' })