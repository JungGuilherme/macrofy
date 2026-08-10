// One-off local backfill for macro_cycle_history — runs entirely on your own
// machine, writes to the DB via REST (same auth pattern as
// run-sql-migration.mjs), no edge function deploy needed.
//
// Usage: node scripts/backfill-macro-cycle.mjs [fromDate]
// Env:   SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD

const { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD');
  process.exit(1);
}
const FROM = process.argv[2] || '2015-01-01';
const TESOURO_CSV_URL =
  'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv';
const GROWTH_SERIES = ['24364', '20539', '24382', '24369', '25351'];
const MIN_ANOS = 0.5;

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

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ';' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += c;
  }
  result.push(current.trim());
  return result;
}
function parseDateBR(s) { const m = s?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; }
function parseNumberBR(s) { if (!s) return null; const n = parseFloat(s.replace(',', '.')); return Number.isFinite(n) ? n : null; }

async function loadTesouroRows() {
  console.log('Baixando CSV da Tesouro Transparente…');
  const res = await fetch(TESOURO_CSV_URL);
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const text = Buffer.from(buf).toString('latin1');
  const lines = text.split('\n');
  const header = parseCSVLine(lines[0]);
  const iTipo = header.indexOf('Tipo Titulo');
  const iVenc = header.indexOf('Data Vencimento');
  const iBase = header.indexOf('Data Base');
  const iTaxa = header.indexOf('Taxa Compra Manha');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    const tipoTitulo = cols[iTipo];
    if (!tipoTitulo) continue;
    let tipo = null;
    if (tipoTitulo.includes('Tesouro Prefixado')) tipo = 'nominal';
    else if (tipoTitulo.includes('Tesouro IPCA+')) tipo = 'real';
    if (!tipo) continue;
    const dataBase = parseDateBR(cols[iBase]);
    const dataVencimento = parseDateBR(cols[iVenc]);
    const taxa = parseNumberBR(cols[iTaxa]);
    if (!dataBase || !dataVencimento || taxa == null) continue;
    rows.push({ tipo, dataBase, dataVencimento, taxa });
  }
  console.log(`${rows.length} linhas nominal/real carregadas.`);
  return rows;
}

function buildCurveAtDate(rows, tipo, targetIso) {
  let usedDate = null;
  for (const r of rows) {
    if (r.tipo !== tipo || r.dataBase > targetIso) continue;
    if (!usedDate || r.dataBase > usedDate) usedDate = r.dataBase;
  }
  if (!usedDate) return null;
  const byVenc = new Map();
  for (const r of rows) {
    if (r.tipo !== tipo || r.dataBase !== usedDate) continue;
    const anos = (new Date(r.dataVencimento).getTime() - new Date(usedDate).getTime()) / (365 * 86400000);
    if (anos < MIN_ANOS) continue;
    const arr = byVenc.get(r.dataVencimento);
    if (arr) arr.push(r.taxa); else byVenc.set(r.dataVencimento, [r.taxa]);
  }
  const curve = Array.from(byVenc.entries())
    .map(([venc, taxas]) => ({
      anos: (new Date(venc).getTime() - new Date(usedDate).getTime()) / (365 * 86400000),
      taxa: taxas.reduce((a, b) => a + b, 0) / taxas.length,
    }))
    .sort((a, b) => a.anos - b.anos);
  return curve.length ? { usedDate, curve } : null;
}
function interpolateAtYears(curve, t) {
  if (!curve.length) return null;
  if (t <= curve[0].anos) return curve[0].taxa;
  if (t >= curve[curve.length - 1].anos) return curve[curve.length - 1].taxa;
  for (let i = 0; i < curve.length - 1; i++) {
    if (curve[i].anos <= t && curve[i + 1].anos >= t) {
      const w = (t - curve[i].anos) / (curve[i + 1].anos - curve[i].anos);
      return curve[i].taxa + w * (curve[i + 1].taxa - curve[i].taxa);
    }
  }
  return null;
}
function inflacao1Y(rows, targetIso) {
  const nominal = buildCurveAtDate(rows, 'nominal', targetIso);
  const real = buildCurveAtDate(rows, 'real', targetIso);
  if (!nominal || !real) return null;
  const tn = interpolateAtYears(nominal.curve, 1.0);
  const tr = interpolateAtYears(real.curve, 1.0);
  if (tn == null || tr == null) return null;
  const impl = ((1 + tn / 100) / (1 + tr / 100) - 1) * 100;
  return { implicita: Math.round(impl * 100) / 100 };
}

function monthEndDates(fromIso, toIso) {
  const out = [];
  const cursor = new Date(fromIso + 'T00:00:00Z');
  cursor.setUTCDate(1); cursor.setUTCMonth(cursor.getUTCMonth() + 1); cursor.setUTCDate(0);
  const end = new Date(toIso + 'T00:00:00Z');
  while (cursor <= end) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1); cursor.setUTCMonth(cursor.getUTCMonth() + 1); cursor.setUTCDate(0);
  }
  return out;
}

function classify(growthUp, inflationUp) {
  if (growthUp && !inflationUp) return 'Goldilocks';
  if (growthUp && inflationUp) return 'Reflação';
  if (!growthUp && inflationUp) return 'Estagflação';
  return 'Deflação';
}

async function growthCompositeAsOf(token, targetIso) {
  const scores = [];
  for (const code of GROWTH_SERIES) {
    const url = `${SUPABASE_URL}/rest/v1/macro_heatmap_data?country=eq.BR&series_code=eq.${code}&heat_score=not.is.null&date=lte.${targetIso}&order=date.desc&limit=1&select=heat_score`;
    const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
    const rows = await res.json();
    if (Array.isArray(rows) && rows[0]?.heat_score != null) scores.push(Number(rows[0].heat_score));
  }
  if (scores.length === 0) return { composite: null, count: 0 };
  return { composite: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100, count: scores.length };
}

async function main() {
  const token = await login();
  console.log('Login ok.');
  const rows = await loadTesouroRows();

  const toIso = new Date().toISOString().slice(0, 10);
  const dates = monthEndDates(FROM, toIso);
  console.log(`Calculando ${dates.length} meses de ${FROM} até ${toIso}…`);

  let prevGrowth = null;
  let prevInfl = null;
  const upserts = [];

  for (const dateIso of dates) {
    const infl = inflacao1Y(rows, dateIso);
    const growth = await growthCompositeAsOf(token, dateIso);
    if (!infl) continue;

    let quadrante = null;
    if (growth.composite != null) {
      const growthUp = prevGrowth != null ? growth.composite >= prevGrowth : growth.composite >= 0;
      const inflationUp = prevInfl != null ? infl.implicita >= prevInfl : false;
      quadrante = classify(growthUp, inflationUp);
    }

    upserts.push({
      country: 'BR',
      date: dateIso,
      growth_composite: growth.composite,
      growth_series_count: growth.count,
      inflacao_implicita_1a: infl.implicita,
      inflacao_vertice: null,
      quadrante,
      computed_at: new Date().toISOString(),
    });

    prevGrowth = growth.composite ?? prevGrowth;
    prevInfl = infl.implicita;
    console.log(`${dateIso} → growth=${growth.composite} infl=${infl.implicita} quadrante=${quadrante}`);
  }

  console.log(`Gravando ${upserts.length} linhas em macro_cycle_history…`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/macro_cycle_history?on_conflict=country,date`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(upserts),
  });
  if (!res.ok) {
    console.error(`Falhou: HTTP ${res.status}`);
    console.error(await res.text());
    process.exit(1);
  }
  console.log('✓ Backfill concluído com sucesso.');
}

main().catch((err) => { console.error(err); process.exit(1); });
