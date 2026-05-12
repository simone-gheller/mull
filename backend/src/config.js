export const envSchema = {
  type: 'object',
  required: ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'MASTER_KEY_HEX'],
  properties: {
    DATABASE_URL:             { type: 'string' },
    SUPABASE_URL:             { type: 'string' },
    SUPABASE_PUBLISHABLE_KEY: { type: 'string' },
    SUPABASE_SECRET_KEY:      { type: 'string' },
    SUPABASE_PROJECT_REF:     { type: 'string' },
    MASTER_KEY_HEX:           { type: 'string', minLength: 64, maxLength: 64 },
    KEK_VERSION:              { type: 'string' },
    APP_URL:                  { type: 'string', default: 'http://localhost:5173' },
    SMTP_HOST:                { type: 'string', default: '127.0.0.1' },
    SMTP_PORT:                { type: 'string', default: '54325' },
    SMTP_FROM:                { type: 'string', default: 'noreply@mull.app' },
    BILLING_PROVIDER:         { type: 'string', default: 'paddle' },
    PADDLE_ENV:               { type: 'string', default: 'sandbox' },
    PADDLE_API_KEY:           { type: 'string' },
    PADDLE_CLIENT_TOKEN:      { type: 'string' },
    PADDLE_WEBHOOK_SECRET:    { type: 'string' },
    PADDLE_PRICE_TEAM_MONTHLY:     { type: 'string' },
    PADDLE_PRICE_TEAM_YEARLY:      { type: 'string' },
    PADDLE_PRICE_BUSINESS_MONTHLY: { type: 'string' },
    PADDLE_PRICE_BUSINESS_YEARLY:  { type: 'string' },
    PORT:                     { type: 'integer', default: 3000 },
    LOG_LEVEL:                { type: 'string', default: 'info' }
  }
};

export const billingConfig = {
  selfServePlans: ['TEAM', 'BUSINESS'],
  subscriptionStatuses: new Set(['TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED']),
  activeStatuses: new Set(['ACTIVE', 'TRIALING', 'PAST_DUE'])
};
