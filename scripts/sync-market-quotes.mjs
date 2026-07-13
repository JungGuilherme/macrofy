// Fetches quotes from Yahoo Finance for the home markets section and
// upserts them into market_quotes via PostgREST (admin JWT).
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD

const { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing env vars');
  process.exit(1);
}

const SYMBOLS = {
  // Brasil
  '^BVSP': 'Ibovespa',
  'IFIX.SA': 'IFIX',
  'SMAL11.SA': 'Small Caps',
  'BRL=X': 'Dólar',
  // EUA
  '^GSPC': 'S&P 500',
  '^IXIC': 'Nasdaq',
  '^DJI': 'Dow Jones',
  '^TNX': 'US 10Y',
  // Ásia
  '^N225': 'Nikkei 225',
  '000001.SS': 'Shanghai',
  '^HSI': 'Hang Seng',
  '^TWII': 'Taiwan (TAIEX)',
  // Europa
  '^STOXX50E': 'Euro Stoxx 50',
  '^GDAXI': 'DAX',
  '^FTSE': 'FTSE 100',
  '^FCHI': 'CAC 40',
  // Cripto
  'BTC-USD': 'Bitcoin',
  'ETH-USD': 'Ethereum',
  'SOL-USD': 'Solana',
  'DOGE-USD': 'Dogecoin',
  // Commodities
  'BZ=F': 'Brent',
  'CL=F': 'WTI',
  'GC=F': 'Ouro',
  'SI=F': 'Prata',
  'TIO=F': 'Minério de Ferro',
  // Agro
  'LE=F': 'Boi Gordo (CME)',
  'ZS=F': 'Soja',
  'ZC=F': 'Milho',
  'KC=F': 'Café',
  'SB=F': 'Açúcar',
};

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

async function fetchQuote(symbol, name) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; macrofy)' } });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - prev;
    return {
      symbol,
      name,
      price,
      change: Number(change.toFixed(4)),
      change_percent: prev ? Number(((change / prev) * 100).toFixed(4)) : 0,
      currency: meta.currency || 'USD',
      updated_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

const quotes = (
  await Promise.all(Object.entries(SYMBOLS).map(([s, n]) => fetchQuote(s, n)))
).filter(Boolean);

const failed = Object.keys(SYMBOLS).filter((s) => !quotes.some((q) => q.symbol === s));
console.log(`Fetched ${quotes.length}/${Object.keys(SYMBOLS).length}` +
  (failed.length ? ` (failed: ${failed.join(', ')})` : ''));

if (quotes.length === 0) {
  console.error('No quotes fetched');
  process.exit(1);
}

const token = await login();
const res = await fetch(`${SUPABASE_URL}/rest/v1/market_quotes?on_conflict=symbol`, {
  method: 'POST',
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  },
  body: JSON.stringify(quotes),
});

if (!res.ok) {
  console.error(`Upsert failed: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
console.log('Done.');
