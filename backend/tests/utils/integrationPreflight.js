import { Client } from 'pg';

const { DATABASE_URL } = process.env;

function fail(message, detail) {
  console.error(`\nIntegration test preflight failed: ${message}`);
  if (detail) {
    console.error(detail);
  }
  console.error('\nStart Supabase locally with `npm run supabase:start` from `backend/`, then rerun `npm run test:integration`.');
  process.exit(1);
}

if (!DATABASE_URL) {
  fail('DATABASE_URL is not set.', 'Integration tests need a PostgreSQL database, usually Supabase local on 127.0.0.1:54322.');
}

const client = new Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
  await client.query('select 1');
} catch (error) {
  fail('cannot connect to the integration database.', error.message);
} finally {
  await client.end().catch(() => {});
}
