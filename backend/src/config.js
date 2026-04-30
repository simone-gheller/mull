export const envSchema = {
  type: 'object',
  required: ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'MASTER_KEY_HEX'],
  properties: {
    DATABASE_URL:             { type: 'string' },
    SUPABASE_URL:             { type: 'string' },
    SUPABASE_PUBLISHABLE_KEY: { type: 'string' },
    SUPABASE_SECRET_KEY:      { type: 'string' },
    SUPABASE_PROJECT_REF:     { type: 'string' },
    MASTER_KEY_HEX:           { type: 'string', minLength: 64, maxLength: 64 },
    KEK_VERSION:              { type: 'string' },
    PORT:                     { type: 'integer', default: 3000 },
    LOG_LEVEL:                { type: 'string', default: 'info' }
  }
};