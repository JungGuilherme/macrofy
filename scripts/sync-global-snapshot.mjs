// Updates macro_global_snapshot directly via PostgREST, replacing the
// sync-macro-global edge function (which times out at the gateway while
// fetching ~85 World Bank series sequentially). Runs in GitHub Actions
// where there is no such limit, and fetches in parallel.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD

const { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing env vars (SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD)');
  process.exit(1);
}

/* ── Same mappings as the edge function ── */
const BR_SERIES = {
  '24364': 'gdp_yoy',
  '13522': 'cpi_yoy',
  '432': 'policy_rate',
  '24369': 'unemployment',
  '13762': 'govt_debt_gdp',
};
const BR_YOY = new Set(['24364']);

const US_SERIES = {
  GDPC1: 'gdp_yoy',
  CPIAUCSL: 'cpi_yoy',
  CPILFESL: 'core_cpi_yoy',
  DFEDTARU: 'policy_rate',
  UNRATE: 'unemployment',
};
const US_YOY = new Set(['GDPC1', 'CPIAUCSL', 'CPILFESL']);

const WB_INDICATORS = {
  'NY.GDP.MKTP.KD.ZG': 'gdp_yoy',
  'FP.CPI.TOTL.ZG': 'cpi_yoy',
  'SL.UEM.TOTL.ZS': 'unemployment',
  'GC.DOD.TOTL.GD.ZS': 'govt_debt_gdp',
  'BN.CAB.XOKA.GD.ZS': 'current_account_gdp',
};

const WB_COUNTRIES = {
  XC: 'XC', CHN: 'CN', JPN: 'JP', DEU: 'DE', GBR: 'GB', FRA: 'FR',
  IND: 'IN', ITA: 'IT', CAN: 'CA', KOR: 'KR', MEX: 'MX', AUS: 'AU',
  ESP: 'ES', CHE: 'CH', TUR: 'TR', IDN: 'ID', RUS: 'RU',
};

async function login() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Login failed: ${data.error_description || data.msg || res.status}`);
  }
  return data.access_token;
}

function restHeaders(token) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function latestHeatmapValue(token, country, seriesCode) {
  const url = `${SUPABASE_URL}/rest/v1/macro_heatmap_data` +
    `?country=eq.${country}&series_code=eq.${seriesCode}` +
    `&select=raw_value,yoy_value,date&order=date.desc&limit=1`;
  const res = await fetch(url, { headers: restHeaders(token) });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] ?? null;
}

async function heatmapSnapshot(token, country, seriesMap, yoySet) {
  const out = {};
  await Promise.all(Object.entries(seriesMap).map(async ([code, field]) => {
    const row = await latestHeatmapValue(token, country, code);
    if (row) out[field] = yoySet.has(code) ? row.yoy_value : row.raw_value;
  }));
  return out;
}

async function fetchWB(iso2, indicator) {
  try {
    const url = `https://api.worldbank.org/v2/country/${iso2}/indicator/${indicator}?format=json&per_page=1&mrv=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const value = json?.[1]?.[0]?.value;
    return value == null ? null : parseFloat(value.toFixed(2));
  } catch {
    return null;
  }
}

async function wbSnapshot(iso2) {
  const out = {};
  await Promise.all(Object.entries(WB_INDICATORS).map(async ([code, field]) => {
    const value = await fetchWB(iso2, code);
    if (value !== null) out[field] = value;
  }));
  return out;
}

async function updateCountry(token, countryCode, fields, source) {
  const clean = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== null && v !== undefined)
  );
  if (Object.keys(clean).length === 0) return { countryCode, status: 'no_data' };

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/macro_global_snapshot?country_code=eq.${countryCode}`,
    {
      method: 'PATCH',
      headers: { ...restHeaders(token), Prefer: 'return=minimal' },
      body: JSON.stringify({ ...clean, source, updated_at: new Date().toISOString() }),
    }
  );
  return {
    countryCode,
    status: res.ok ? 'ok' : `http_${res.status}`,
    fields: Object.keys(clean),
  };
}

const token = await login();
console.log('✓ Logged in');

const results = [];

// Brazil & USA from already-synced heatmap data
const br = await heatmapSnapshot(token, 'BR', BR_SERIES, BR_YOY);
results.push(await updateCountry(token, 'BRA', br, 'bcb'));

const us = await heatmapSnapshot(token, 'US', US_SERIES, US_YOY);
results.push(await updateCountry(token, 'USA', us, 'fred'));

// Other countries from World Bank — all in parallel
const wbResults = await Promise.all(
  Object.entries(WB_COUNTRIES).map(async ([code, iso2]) => {
    const data = await wbSnapshot(iso2);
    return updateCountry(token, code, data, 'worldbank');
  })
);
results.push(...wbResults);

let failed = 0;
for (const r of results) {
  const icon = r.status === 'ok' ? '✓' : '✗';
  if (r.status !== 'ok' && r.status !== 'no_data') failed++;
  console.log(`${icon} ${r.countryCode}: ${r.status}${r.fields ? ` (${r.fields.join(', ')})` : ''}`);
}

if (failed > 0) {
  console.error(`${failed} countries failed to update`);
  process.exit(1);
}
console.log('Done.');
