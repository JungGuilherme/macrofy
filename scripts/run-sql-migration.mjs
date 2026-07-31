// Applies a .sql file directly to the database via the admin_run_sql RPC
// (see supabase/manual/ZZ-bootstrap-admin-migrations.sql), no Lovable chat needed.
//
// Usage: node scripts/run-sql-migration.mjs supabase/manual/strategic-wallets.sql
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
//   (same vars used by scripts/sync-*.mjs; can be exported from .env manually
//   or read via `node --env-file=.env` on Node 20.6+)

import { readFileSync } from 'node:fs';

const { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD');
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-sql-migration.mjs <path-to-sql-file>');
  process.exit(1);
}

const sql = readFileSync(file, 'utf8');

async function login() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Login failed: ${data.msg || res.status}`);
  return data.access_token;
}

const token = await login();
console.log(`Applying ${file} …`);

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_run_sql`, {
  method: 'POST',
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sql }),
});

if (!res.ok) {
  console.error(`Failed: HTTP ${res.status}`);
  console.error(await res.text());
  process.exit(1);
}

console.log('✓ Migration applied successfully.');
