// One-shot RSS curation (2026-07-15, agreed with the user):
//  - deactivate noisy/duplicate feeds
//  - replace mojibake feeds (Folha/UOL fetched as ISO-8859-1 by the edge
//    function) with UTF-8 Google News per-site feeds
//  - add InfoMoney Economia/Mercados (their official RSS ships no items)
// Safe to re-run: every step is idempotent.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD

const { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing env vars');
  process.exit(1);
}

const GN = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

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
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

const token = await login();

const feeds = await (
  await fetch(`${SUPABASE_URL}/rest/v1/rss_feeds?select=id,name,themes,theme,feed_url,is_active,display_order`, {
    headers: headers(token),
  })
).json();
console.log(`Loaded ${feeds.length} feeds`);

async function patch(id, body, label) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rss_feeds?id=eq.${id}`, {
    method: 'PATCH', headers: headers(token), body: JSON.stringify(body),
  });
  console.log(`${res.ok ? '✓' : '✗'} ${label}${res.ok ? '' : ` (HTTP ${res.status})`}`);
}

const hasTheme = (f, t) => (f.themes ?? []).includes(t) || f.theme === t;

/* 1 ── deactivate noise ── */
const toDeactivate = feeds.filter((f) =>
  f.is_active !== false && (
    f.name === 'Financial Juice' ||
    f.name === 'Google' ||
    f.name === 'Investing Ações' ||
    (f.name === 'Investing.com' && hasTheme(f, 'empresas')) ||
    (f.name === 'Investing' && hasTheme(f, 'politica'))
  )
);
// duplicate Investing.com macro feeds: keep the first by display_order
const macroDupes = feeds
  .filter((f) => f.is_active !== false && f.name === 'Investing.com' && hasTheme(f, 'macro'))
  .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99))
  .slice(1);

for (const f of [...toDeactivate, ...macroDupes]) {
  await patch(f.id, { is_active: false }, `desativar: ${f.name} [${(f.themes ?? [f.theme]).join(',')}]`);
}

/* 2 ── replace mojibake sources with UTF-8 Google News equivalents ── */
const replacements = [
  { match: (f) => f.name === 'Folha de São Paulo', url: GN('site:folha.uol.com.br/mercado'), newName: 'Folha — Mercado' },
  { match: (f) => f.name === 'Folha de SP', url: GN('site:folha.uol.com.br/poder'), newName: 'Folha — Poder' },
  { match: (f) => f.name === 'UOL', url: GN('site:economia.uol.com.br'), newName: 'UOL Economia' },
];
for (const r of replacements) {
  const f = feeds.find(r.match);
  if (!f) { console.log(`— não encontrado: ${r.newName}`); continue; }
  // items cleared so the next refresh repopulates without mojibake
  await patch(f.id, { feed_url: r.url, name: r.newName, items: [] }, `substituir: ${f.name} → ${r.newName}`);
}

/* 3 ── add InfoMoney (economia + mercados only, per user request) ── */
const additions = [
  { name: 'InfoMoney Economia', feed_url: GN('site:infomoney.com.br/economia'), themes: ['macro'] },
  { name: 'InfoMoney Mercados', feed_url: GN('site:infomoney.com.br/mercados'), themes: ['mercados'] },
  { name: 'Valor — Brasil', feed_url: GN('site:valor.globo.com/brasil'), themes: ['macro'] },
  { name: 'Valor — Finanças', feed_url: GN('site:valor.globo.com/financas'), themes: ['mercados'] },
];
const maxOrder = Math.max(0, ...feeds.map((f) => f.display_order ?? 0));
for (const [i, a] of additions.entries()) {
  if (feeds.some((f) => f.name === a.name)) { console.log(`— já existe: ${a.name}`); continue; }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rss_feeds`, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({ ...a, items: [], is_active: true, display_order: maxOrder + i + 1 }),
  });
  console.log(`${res.ok ? '✓' : '✗'} adicionar: ${a.name}${res.ok ? '' : ` (HTTP ${res.status} ${await res.text()})`}`);
}

/* 4 ── refresh so the portal repopulates immediately ── */
const refresh = await fetch(`${SUPABASE_URL}/functions/v1/refresh-rss`, {
  method: 'POST',
  headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: '{}',
});
console.log(`${refresh.ok ? '✓' : '✗'} refresh-rss disparado (HTTP ${refresh.status})`);
console.log('Curadoria concluída.');
