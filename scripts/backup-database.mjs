// Exports every table the admin can read into backups/data/*.json.
// Tables are discovered dynamically from PostgREST's OpenAPI root, so new
// tables are picked up automatically. Auth users (emails/passwords) live in
// the auth schema and are NOT exportable this way — only public.profiles.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD

import { mkdirSync, writeFileSync } from 'fs';

const { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing env vars');
  process.exit(1);
}

const PAGE = 1000;

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

function headers(token) {
  return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` };
}

async function listTables(token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Schema discovery failed: HTTP ${res.status}`);
  const spec = await res.json();
  return Object.keys(spec.paths ?? {})
    .filter((p) => p.startsWith('/') && p !== '/' && !p.startsWith('/rpc'))
    .map((p) => p.slice(1))
    .sort();
}

async function exportTable(token, table) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=&limit=${PAGE}&offset=${offset}`, {
      headers: headers(token),
    });
    if (!res.ok) return { table, error: `HTTP ${res.status}`, rows: rows.length };
    const chunk = await res.json();
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return { table, rows: rows.length, data: rows };
}

const token = await login();
const tables = await listTables(token);
console.log(`Discovered ${tables.length} tables`);

mkdirSync('backups/data', { recursive: true });

const manifest = { generated_at: new Date().toISOString(), tables: {} };
let failed = 0;

for (const table of tables) {
  const result = await exportTable(token, table);
  if (result.error) {
    console.log(`✗ ${table}: ${result.error}`);
    manifest.tables[table] = { rows: null, error: result.error };
    failed++;
    continue;
  }
  writeFileSync(`backups/data/${table}.json`, JSON.stringify(result.data, null, 1));
  manifest.tables[table] = { rows: result.rows };
  console.log(`✓ ${table}: ${result.rows} rows`);
}

writeFileSync('backups/manifest.json', JSON.stringify(manifest, null, 2));
console.log(`Done — ${tables.length - failed}/${tables.length} tables exported.`);
