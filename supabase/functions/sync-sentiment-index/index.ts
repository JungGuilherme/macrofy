import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ═══════════════════════ CONFIGURATION ═══════════════════════ */

const US_BREADTH = ["XLK","XLF","XLV","XLI","XLY","XLP","XLE","XLU","XLB","XLRE","XLC"];
const BR_BASKET = ["PETR4.SA","VALE3.SA","ITUB4.SA","BBDC4.SA","ABEV3.SA","WEGE3.SA","B3SA3.SA","RENT3.SA","SUZB3.SA","JBSS3.SA"];

/* ═══════════════════════ DATA FETCHERS ═══════════════════════ */

interface TimeSeries { dates: string[]; values: number[] }

async function fetchYahoo(symbol: string): Promise<TimeSeries | null> {
  for (const host of ["query2.finance.yahoo.com", "query1.finance.yahoo.com"]) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64)" } });
      if (!res.ok) continue;
      const json = await res.json();
      const r = json?.chart?.result?.[0];
      if (!r?.timestamp) continue;
      const closes = r.indicators?.adjclose?.[0]?.adjclose ?? r.indicators?.quote?.[0]?.close ?? [];
      const dates: string[] = [], values: number[] = [];
      for (let i = 0; i < r.timestamp.length; i++) {
        if (closes[i] != null && !isNaN(closes[i])) {
          dates.push(new Date(r.timestamp[i] * 1000).toISOString().split("T")[0]);
          values.push(closes[i]);
        }
      }
      if (dates.length > 50) return { dates, values };
    } catch {}
  }
  return null;
}

async function fetchFred(seriesId: string, apiKey: string): Promise<TimeSeries | null> {
  try {
    const start = new Date(); start.setFullYear(start.getFullYear() - 2);
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${start.toISOString().split("T")[0]}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const dates: string[] = [], values: number[] = [];
    for (const o of json.observations ?? []) {
      if (o.value !== ".") { dates.push(o.date); values.push(+o.value); }
    }
    return dates.length > 10 ? { dates, values } : null;
  } catch { return null; }
}

/* ═══════════════════════ MATH UTILITIES ═══════════════════════ */

function sma(data: number[], w: number): (number | null)[] {
  const r: (number | null)[] = []; let s = 0;
  for (let i = 0; i < data.length; i++) {
    s += data[i]; if (i >= w) s -= data[i - w];
    r.push(i >= w - 1 ? s / w : null);
  }
  return r;
}

function pctRank(series: number[], val: number): number {
  if (!series.length) return 50;
  return (series.filter(v => v < val).length / series.length) * 100;
}

function stdDev(d: number[]): number {
  const m = d.reduce((a, b) => a + b, 0) / d.length;
  return Math.sqrt(d.reduce((a, b) => a + (b - m) ** 2, 0) / d.length);
}

function regime(s: number): string {
  if (s <= 24) return "Extreme Fear";
  if (s <= 44) return "Fear";
  if (s <= 55) return "Neutral";
  if (s <= 75) return "Greed";
  return "Extreme Greed";
}

/* ═══════════════════════ INDICATOR CALCULATORS ═══════════════════════ */

type DatedValue = { date: string; raw: number };

/** % distance from SMA(window) */
function momentumSeries(ts: TimeSeries, window = 125): DatedValue[] {
  const ma = sma(ts.values, window);
  const out: DatedValue[] = [];
  for (let i = 0; i < ts.values.length; i++) {
    const m = ma[i];
    if (m !== null) out.push({ date: ts.dates[i], raw: ((ts.values[i] - m) / m) * 100 });
  }
  return out;
}

/** VIX distance from SMA50 */
function vixSeries(ts: TimeSeries): DatedValue[] {
  return momentumSeries(ts, 50);
}

/** 20-day return difference: stocks - bonds */
function safeHavenSeries(stocks: TimeSeries, bonds: TimeSeries): DatedValue[] {
  const bondMap = new Map(bonds.dates.map((d, i) => [d, bonds.values[i]]));
  const aligned: { date: string; sv: number; bv: number }[] = [];
  for (let i = 0; i < stocks.dates.length; i++) {
    const bv = bondMap.get(stocks.dates[i]);
    if (bv != null) aligned.push({ date: stocks.dates[i], sv: stocks.values[i], bv });
  }
  const out: DatedValue[] = [];
  for (let i = 20; i < aligned.length; i++) {
    const sr = (aligned[i].sv - aligned[i - 20].sv) / aligned[i - 20].sv;
    const br = (aligned[i].bv - aligned[i - 20].bv) / aligned[i - 20].bv;
    out.push({ date: aligned[i].date, raw: (sr - br) * 100 });
  }
  return out;
}

/** HY spread raw values (inverted during normalization) */
function junkBondSeries(ts: TimeSeries): DatedValue[] {
  return ts.dates.map((d, i) => ({ date: d, raw: ts.values[i] }));
}

/** % of basket above SMA200 */
function breadthAboveMa200(basket: TimeSeries[]): DatedValue[] {
  const allMa = basket.map(b => ({
    dateMap: new Map(b.dates.map((d, i) => [d, i])),
    values: b.values,
    ma: sma(b.values, 200),
  }));
  const allDates = new Set<string>();
  for (const b of basket) for (const d of b.dates) allDates.add(d);
  const sortedDates = Array.from(allDates).sort();
  const out: DatedValue[] = [];
  for (const date of sortedDates) {
    let above = 0, total = 0;
    for (const a of allMa) {
      const idx = a.dateMap.get(date);
      if (idx !== undefined && a.ma[idx] !== null) {
        total++;
        if (a.values[idx] > a.ma[idx]!) above++;
      }
    }
    if (total >= 3) out.push({ date, raw: (above / total) * 100 });
  }
  return out;
}

/** % of basket with positive daily return */
function breadthPositiveReturn(basket: TimeSeries[]): DatedValue[] {
  const allMaps = basket.map(b => ({
    dateMap: new Map(b.dates.map((d, i) => [d, i])),
    values: b.values,
  }));
  const allDates = new Set<string>();
  for (const b of basket) for (const d of b.dates) allDates.add(d);
  const sortedDates = Array.from(allDates).sort();
  const out: DatedValue[] = [];
  for (let di = 1; di < sortedDates.length; di++) {
    const date = sortedDates[di], prevDate = sortedDates[di - 1];
    let pos = 0, total = 0;
    for (const b of allMaps) {
      const idx = b.dateMap.get(date), pidx = b.dateMap.get(prevDate);
      if (idx !== undefined && pidx !== undefined) {
        total++;
        if (b.values[idx] > b.values[pidx]) pos++;
      }
    }
    if (total >= 3) out.push({ date, raw: (pos / total) * 100 });
  }
  return out;
}

/** Realized vol 21d (annualized) */
function realizedVolSeries(ts: TimeSeries): DatedValue[] {
  const returns: number[] = [];
  for (let i = 1; i < ts.values.length; i++) {
    returns.push((ts.values[i] - ts.values[i - 1]) / ts.values[i - 1]);
  }
  const out: DatedValue[] = [];
  for (let i = 20; i < returns.length; i++) {
    const window = returns.slice(i - 20, i + 1);
    out.push({ date: ts.dates[i + 1], raw: stdDev(window) * Math.sqrt(252) * 100 });
  }
  return out;
}

/** B3 foreign flow: 21-day rolling sum */
function foreignFlowSeries(rows: { date: string; foreign_flow: number }[]): DatedValue[] {
  const out: DatedValue[] = [];
  for (let i = 20; i < rows.length; i++) {
    let sum = 0;
    for (let j = i - 20; j <= i; j++) sum += rows[j].foreign_flow;
    out.push({ date: rows[i].date, raw: sum });
  }
  return out;
}

/* ═══════════════════════ MAIN SYNC LOGIC ═══════════════════════ */

async function doSync(): Promise<{ success: boolean; logs: string[] }> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const fredKey = Deno.env.get("FRED_API_KEY") || "";
  const logs: string[] = [];
  const log = (m: string) => { console.log(m); logs.push(m); };

  try {
    log("🚀 Macrofy Sentiment Index sync started");

    // ── Fetch US data ──
    const [spxData, vixData, tltData, fredHY, ...usBreadthRaw] = await Promise.all([
      fetchYahoo("^GSPC"),
      fetchYahoo("^VIX"),
      fetchYahoo("TLT"),
      fredKey ? fetchFred("BAMLH0A0HYM2", fredKey) : Promise.resolve(null),
      ...US_BREADTH.map(s => fetchYahoo(s)),
    ]);
    const usBreadth = usBreadthRaw.filter(Boolean) as TimeSeries[];
    log(`US: SPX=${!!spxData} VIX=${!!vixData} TLT=${!!tltData} FRED=${!!fredHY} Breadth=${usBreadth.length}/${US_BREADTH.length}`);

    await new Promise(r => setTimeout(r, 2000));

    // ── Fetch BR data ──
    const [ibovData, ...brBasketRaw] = await Promise.all([
      fetchYahoo("^BVSP"),
      ...BR_BASKET.map(s => fetchYahoo(s)),
    ]);
    const brBasket = brBasketRaw.filter(Boolean) as TimeSeries[];
    log(`BR: IBOV=${!!ibovData} Basket=${brBasket.length}/${BR_BASKET.length}`);

    // ── Read B3 flow ──
    const { data: b3Rows } = await supabase
      .from("b3_flow_daily")
      .select("date, foreign_flow")
      .order("date", { ascending: true });
    log(`B3 flow rows: ${b3Rows?.length || 0}`);

    // ── Calculate components ──
    type Component = { key: string; series: DatedValue[]; inverted: boolean };
    const usComps: Component[] = [];
    const brComps: Component[] = [];

    if (spxData) usComps.push({ key: "momentum", series: momentumSeries(spxData, 125), inverted: false });
    if (vixData) usComps.push({ key: "volatility", series: vixSeries(vixData), inverted: true });
    if (spxData && tltData) usComps.push({ key: "safe_haven", series: safeHavenSeries(spxData, tltData), inverted: false });
    if (fredHY) usComps.push({ key: "junk_bond", series: junkBondSeries(fredHY), inverted: true });
    if (usBreadth.length >= 5) usComps.push({ key: "breadth", series: breadthAboveMa200(usBreadth), inverted: false });

    if (ibovData) {
      brComps.push({ key: "momentum", series: momentumSeries(ibovData, 125), inverted: false });
      brComps.push({ key: "volatility", series: realizedVolSeries(ibovData), inverted: true });
    }
    if (brBasket.length >= 5) {
      brComps.push({ key: "strength", series: breadthAboveMa200(brBasket), inverted: false });
      brComps.push({ key: "breadth", series: breadthPositiveReturn(brBasket), inverted: false });
    }
    if (b3Rows && b3Rows.length > 21) {
      const flowRows = b3Rows.map((r: any) => ({ date: r.date, foreign_flow: Number(r.foreign_flow) }));
      brComps.push({ key: "foreign_flow", series: foreignFlowSeries(flowRows), inverted: false });
    }

    log(`Components: US=[${usComps.map(c => c.key)}] BR=[${brComps.map(c => c.key)}]`);

    // ── Normalize & store ──
    const compRows: any[] = [];
    const indexByDate: Record<string, { sum: number; count: number }> = {};

    const processRegion = (region: string, comps: Component[]) => {
      for (const comp of comps) {
        const rawValues = comp.series.map(s => s.raw);
        const recent = comp.series.slice(-90);
        for (const pt of recent) {
          let score = pctRank(rawValues, pt.raw);
          if (comp.inverted) score = 100 - score;
          score = Math.round(Math.max(0, Math.min(100, score)));
          compRows.push({
            region, date: pt.date, component_key: comp.key,
            raw_value: Math.round(pt.raw * 100) / 100,
            normalized_score: score,
            updated_at: new Date().toISOString(),
          });
          const dk = `${region}|${pt.date}`;
          if (!indexByDate[dk]) indexByDate[dk] = { sum: 0, count: 0 };
          indexByDate[dk].sum += score;
          indexByDate[dk].count += 1;
        }
      }
    };

    processRegion("us", usComps);
    processRegion("br", brComps);

    // Batch upsert components
    for (let i = 0; i < compRows.length; i += 500) {
      const { error } = await supabase
        .from("macrofy_sentiment_components")
        .upsert(compRows.slice(i, i + 500), { onConflict: "region,date,component_key" });
      if (error) log(`Comp upsert err: ${error.message}`);
    }
    log(`Upserted ${compRows.length} component rows`);

    // Calculate headline index
    const idxRows: any[] = [];
    for (const [dk, data] of Object.entries(indexByDate)) {
      const [region, date] = dk.split("|");
      const headline = Math.round(data.sum / data.count);
      idxRows.push({
        region, date,
        headline_score: headline,
        regime_label: regime(headline),
        valid_components_count: data.count,
        updated_at: new Date().toISOString(),
      });
    }

    for (let i = 0; i < idxRows.length; i += 500) {
      const { error } = await supabase
        .from("macrofy_sentiment_index")
        .upsert(idxRows.slice(i, i + 500), { onConflict: "region,date" });
      if (error) log(`Index upsert err: ${error.message}`);
    }
    log(`Upserted ${idxRows.length} index rows`);
    log("✅ Sync complete");
    return { success: true, logs };
  } catch (e) {
    const msg = (e as Error).message;
    log(`❌ Error: ${msg}`);
    return { success: false, logs };
  }
}

/* ═══════════════════════ HTTP HANDLER ═══════════════════════ */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth gate: allow admin JWT or shared cron secret
  const _syncSecret = Deno.env.get("SYNC_SECRET");
  const _provided = req.headers.get("x-sync-secret");
  const _authHeader = req.headers.get("Authorization");
  let _allowed = false;
  if (_syncSecret && _provided && _provided === _syncSecret) {
    _allowed = true;
  } else if (_authHeader?.startsWith("Bearer ")) {
    try {
      const _sb = (await import("https://esm.sh/@supabase/supabase-js@2")).createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: _authHeader } } }
      );
      const { data: _claims } = await _sb.auth.getClaims(_authHeader.replace("Bearer ", ""));
      if (_claims?.claims?.sub) {
        const { data: _role } = await _sb.from("user_roles").select("role").eq("user_id", _claims.claims.sub).eq("role", "admin").maybeSingle();
        if (_role) _allowed = true;
      }
    } catch (_e) { /* ignore */ }
  }
  if (!_allowed) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }



  const result = await doSync();

  return new Response(
    JSON.stringify(result),
    { 
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
});
