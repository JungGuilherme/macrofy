// Declarative RSS curation (2026-07-15, v2 — agreed with the user):
// the portal runs on exactly five feeds — InfoMoney (economia+mercados),
// Valor (brasil+finanças) and Investing "Notícias Mais Lidas". Everything
// else is deactivated (not deleted). Idempotent; safe to re-run anytime.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD

const { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing env vars');
  process.exit(1);
}

const GN = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

/** The desired end state. `theme` (legacy single) powers old widgets. */
const KEEP = [
  { name: 'Investing — Mais Lidas', feed_url: 'https://br.investing.com/rss/news_285.rss', themes: [], theme: 'Mais Lidas' },
  { name: 'InfoMoney Economia', feed_url: GN('site:infomoney.com.br/economia'), themes: ['macro'], theme: null },
  { name: 'InfoMoney Mercados', feed_url: GN('site:infomoney.com.br/mercados'), themes: ['mercados'], theme: null },
  { name: 'Valor — Brasil', feed_url: GN('site:valor.globo.com/brasil'), themes: ['macro'], theme: null },
  { name: 'Valor — Finanças', feed_url: GN('site:valor.globo.com/financas'), themes: ['mercados'], theme: null },
];

// Rows that are infrastructure, not news feeds — never touch.
const INFRA = ['YouTube · Alta Vista'];

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
  await fetch(`${SUPABASE_URL}/rest/v1/rss_feeds?select=id,name,is_active,feed_url,display_order`, {
    headers: headers(token),
  })
).json();
console.log(`Loaded ${feeds.length} feeds`);

const keepNames = new Set(KEEP.map((k) => k.name));

// 1 ── deactivate everything that isn't in the keep list
for (const f of feeds) {
  if (keepNames.has(f.name) || INFRA.includes(f.name) || f.is_active === false) continue;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rss_feeds?id=eq.${f.id}`, {
    method: 'PATCH', headers: headers(token), body: JSON.stringify({ is_active: false }),
  });
  console.log(`${res.ok ? '✓' : '✗'} desativar: ${f.name}`);
}

// 2 ── ensure each keeper exists, is active and points at the right URL
for (const [i, k] of KEEP.entries()) {
  const existing = feeds.find((f) => f.name === k.name);
  const body = {
    name: k.name, feed_url: k.feed_url, themes: k.themes, theme: k.theme,
    is_active: true, display_order: i + 1,
  };
  if (existing) {
    // clear stored items when the URL changes so refresh repopulates cleanly
    const changed = existing.feed_url !== k.feed_url;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rss_feeds?id=eq.${existing.id}`, {
      method: 'PATCH', headers: headers(token),
      body: JSON.stringify(changed ? { ...body, items: [] } : body),
    });
    console.log(`${res.ok ? '✓' : '✗'} garantir: ${k.name}${changed ? ' (URL trocada, itens limpos)' : ''}`);
  } else {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rss_feeds`, {
      method: 'POST', headers: headers(token),
      body: JSON.stringify({ ...body, items: [] }),
    });
    console.log(`${res.ok ? '✓' : '✗'} criar: ${k.name}${res.ok ? '' : ` (HTTP ${res.status} ${await res.text()})`}`);
  }
}

// 3 ── refresh so the portal repopulates immediately
const refresh = await fetch(`${SUPABASE_URL}/functions/v1/refresh-rss`, {
  method: 'POST',
  headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: '{}',
});
console.log(`${refresh.ok ? '✓' : '✗'} refresh-rss disparado (HTTP ${refresh.status})`);
console.log('Curadoria concluída — 5 feeds ativos.');
