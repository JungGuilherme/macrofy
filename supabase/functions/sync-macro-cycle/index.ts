// Edge function: sync-macro-cycle
//
// Builds the "Ciclos Macro" point for a given date: a growth composite
// (average heat_score of curated BCB series already synced by
// sync-macro-bcb) plotted against 1Y implied inflation — nominal (Tesouro
// Prefixado / LTN+NTN-F) vs real (Tesouro IPCA+ / NTN-B) curves, both
// linearly interpolated to exactly 1 year, from the official Tesouro
// Transparente CSV (same source already used by tesouro-curva, daily data
// back to 2004). No ANBIMA dependency, no new secret.
//
// Two modes:
//   POST (no query params)      → compute + upsert TODAY's point only
//                                  (this is what the daily cron calls)
//   POST ?backfill=1&from=YYYY-MM-DD&to=YYYY-MM-DD
//                                → walk month-end dates in [from, to] and
//                                  upsert one row per month. growth_composite
//                                  is left null for months before
//                                  macro_heatmap_data has history — the
//                                  inflation axis alone still goes back to
//                                  whenever both curves have data (~2006+).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 24364 IBC-Br · 20539 Crédito Total · 24382 Renda Real ·
// 24369 Desemprego (polarity negative, já invertido no heat_score) ·
// 25351 ICC - Indicador de Custo do Crédito (idem)
const GROWTH_SERIES = ["24364", "20539", "24382", "24369", "25351"];

const TESOURO_CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

const MAX_BACKFILL_MONTHS = 260; // ~21 years, matches the CSV's actual depth

/* ─────────────────── Tesouro Transparente CSV parsing ─────────────────── */

type Tipo = "nominal" | "real";
interface TDRow {
  tipo: Tipo;
  dataBase: string; // ISO
  dataVencimento: string; // ISO
  taxa: number;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ";" && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += char;
  }
  result.push(current.trim());
  return result;
}

function parseDateBR(s: string): string | null {
  const m = s?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function parseNumberBR(s: string): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Full CSV is ~14MB / hundreds of thousands of rows across every título type
// (Selic, IGPM+, Educa+, Renda+...) — filter to just the two we need on the
// way in so we don't hold the rest in memory.
async function loadTesouroRows(): Promise<TDRow[]> {
  const res = await fetch(TESOURO_CSV_URL);
  if (!res.ok) throw new Error(`Tesouro Transparente CSV fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const text = new TextDecoder("iso-8859-1").decode(buf);
  const lines = text.split("\n");
  if (lines.length < 2) throw new Error("CSV vazio ou inválido");

  const header = parseCSVLine(lines[0]);
  const iTipo = header.indexOf("Tipo Titulo");
  const iVenc = header.indexOf("Data Vencimento");
  const iBase = header.indexOf("Data Base");
  const iTaxa = header.indexOf("Taxa Compra Manha");
  if ([iTipo, iVenc, iBase, iTaxa].some((i) => i < 0)) {
    throw new Error("Colunas esperadas não encontradas no CSV da Tesouro Transparente");
  }

  const rows: TDRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    const tipoTitulo = cols[iTipo];
    if (!tipoTitulo) continue;

    let tipo: Tipo | null = null;
    if (tipoTitulo.includes("Tesouro Prefixado")) tipo = "nominal"; // LTN + NTN-F
    else if (tipoTitulo.includes("Tesouro IPCA+")) tipo = "real"; // NTN-B + NTN-B Principal
    if (!tipo) continue;

    const dataBase = parseDateBR(cols[iBase]);
    const dataVencimento = parseDateBR(cols[iVenc]);
    const taxa = parseNumberBR(cols[iTaxa]);
    if (!dataBase || !dataVencimento || taxa == null) continue;

    rows.push({ tipo, dataBase, dataVencimento, taxa });
  }
  return rows;
}

/* ───────────────────── curve building / interpolation ─────────────────── */

interface CurvePoint {
  anos: number;
  taxa: number;
}

// Títulos a poucos dias do vencimento cotam taxas anualizadas ruidosas/
// distorcidas (ex.: visto em produção — uma IPCA+ a 8 dias do vencimento
// cotando 14,57% num dia em que o resto da curva real estava em ~8%).
// Exclui esse trecho antes de interpolar.
const MIN_ANOS = 0.5;

// Most recent dataBase <= targetIso for this título type, then the full
// {anos, taxa} curve on that date (averaging duplicate maturities, same
// approach tesouro-curva.ts already uses).
function buildCurveAtDate(rows: TDRow[], tipo: Tipo, targetIso: string): { usedDate: string; curve: CurvePoint[] } | null {
  let usedDate: string | null = null;
  for (const r of rows) {
    if (r.tipo !== tipo || r.dataBase > targetIso) continue;
    if (!usedDate || r.dataBase > usedDate) usedDate = r.dataBase;
  }
  if (!usedDate) return null;

  const byVenc = new Map<string, number[]>();
  for (const r of rows) {
    if (r.tipo !== tipo || r.dataBase !== usedDate) continue;
    const anos = (new Date(r.dataVencimento).getTime() - new Date(usedDate).getTime()) / (365 * 86400000);
    if (anos < MIN_ANOS) continue;
    const arr = byVenc.get(r.dataVencimento);
    if (arr) arr.push(r.taxa);
    else byVenc.set(r.dataVencimento, [r.taxa]);
  }

  const curve: CurvePoint[] = Array.from(byVenc.entries())
    .map(([venc, taxas]) => ({
      anos: (new Date(venc).getTime() - new Date(usedDate!).getTime()) / (365 * 86400000),
      taxa: taxas.reduce((a, b) => a + b, 0) / taxas.length,
    }))
    .sort((a, b) => a.anos - b.anos);

  return curve.length ? { usedDate, curve } : null;
}

function interpolateAtYears(curve: CurvePoint[], targetYears: number): number | null {
  if (!curve.length) return null;
  if (targetYears <= curve[0].anos) return curve[0].taxa;
  if (targetYears >= curve[curve.length - 1].anos) return curve[curve.length - 1].taxa;
  for (let i = 0; i < curve.length - 1; i++) {
    if (curve[i].anos <= targetYears && curve[i + 1].anos >= targetYears) {
      const w = (targetYears - curve[i].anos) / (curve[i + 1].anos - curve[i].anos);
      return curve[i].taxa + w * (curve[i + 1].taxa - curve[i].taxa);
    }
  }
  return null;
}

// Both curves linearly interpolated to exactly anos=1 — a real interpolated
// point, not "nearest bond", so it's stable even when no título matures
// close to the 1y mark.
function inflacao1Y(rows: TDRow[], targetIso: string) {
  const nominal = buildCurveAtDate(rows, "nominal", targetIso);
  const real = buildCurveAtDate(rows, "real", targetIso);
  if (!nominal || !real) return null;

  const taxaNominal = interpolateAtYears(nominal.curve, 1.0);
  const taxaReal = interpolateAtYears(real.curve, 1.0);
  if (taxaNominal == null || taxaReal == null) return null;

  const implicita = ((1 + taxaNominal / 100) / (1 + taxaReal / 100) - 1) * 100;
  return {
    implicita: Math.round(implicita * 100) / 100,
    nominal_1y: Math.round(taxaNominal * 100) / 100,
    real_1y: Math.round(taxaReal * 100) / 100,
    data_nominal: nominal.usedDate,
    data_real: real.usedDate,
  };
}

/* ─────────────────────────── growth composite ─────────────────────────── */

async function growthCompositeAsOf(supabase: ReturnType<typeof createClient>, targetIso: string) {
  const scores: number[] = [];
  for (const code of GROWTH_SERIES) {
    const { data } = await supabase
      .from("macro_heatmap_data")
      .select("heat_score, date")
      .eq("country", "BR")
      .eq("series_code", code)
      .not("heat_score", "is", null)
      .lte("date", targetIso)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.heat_score != null) scores.push(Number(data.heat_score));
  }
  if (scores.length === 0) return { composite: null as number | null, count: 0 };
  return { composite: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100, count: scores.length };
}

function classifyQuadrante(growthUp: boolean, inflationUp: boolean): string {
  if (growthUp && !inflationUp) return "Goldilocks";
  if (growthUp && inflationUp) return "Reflação";
  if (!growthUp && inflationUp) return "Estagflação";
  return "Deflação";
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthEndDates(fromIso: string, toIso: string, cap: number): string[] {
  const out: string[] = [];
  const cursor = new Date(fromIso + "T00:00:00Z");
  cursor.setUTCDate(1);
  cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  cursor.setUTCDate(0); // last day of the starting month
  const end = new Date(toIso + "T00:00:00Z");
  while (cursor <= end && out.length < cap) {
    out.push(isoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    cursor.setUTCDate(0);
  }
  return out;
}

/* ────────────────────────────── HTTP handler ───────────────────────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

  try {
    const url = new URL(req.url);
    const backfill = url.searchParams.get("backfill") === "1";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const rows = await loadTesouroRows();
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "CSV da Tesouro Transparente não retornou linhas nominal/real" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!backfill) {
      const today = isoDate(new Date());
      const infl = inflacao1Y(rows, today);
      if (!infl) {
        return new Response(JSON.stringify({ error: "Não foi possível interpolar a inflação implícita 1A para hoje" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const growth = await growthCompositeAsOf(supabase, today);

      // Direção: compara com o snapshot mais próximo de 90 dias atrás; cai
      // para o registro mais antigo disponível enquanto o histórico for jovem
      const lookback = new Date(today);
      lookback.setUTCDate(lookback.getUTCDate() - 90);
      const lookbackIso = isoDate(lookback);

      const { data: nearLookback } = await supabase
        .from("macro_cycle_history")
        .select("date, growth_composite, inflacao_implicita_1a")
        .eq("country", "BR")
        .lte("date", lookbackIso)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      let prevRow = nearLookback ?? null;
      if (!prevRow) {
        const { data: earliest } = await supabase
          .from("macro_cycle_history")
          .select("date, growth_composite, inflacao_implicita_1a")
          .eq("country", "BR")
          .lt("date", today)
          .order("date", { ascending: true })
          .limit(1)
          .maybeSingle();
        prevRow = earliest ?? null;
      }

      const growthUp =
        growth.composite != null && prevRow?.growth_composite != null
          ? growth.composite >= Number(prevRow.growth_composite)
          : growth.composite != null
          ? growth.composite >= 0
          : true;
      const inflationUp = prevRow ? infl.implicita >= Number(prevRow.inflacao_implicita_1a) : false;
      const quadrante = classifyQuadrante(growthUp, inflationUp);

      const { error: upsertError } = await supabase.from("macro_cycle_history").upsert(
        {
          country: "BR",
          date: today,
          growth_composite: growth.composite,
          growth_series_count: growth.count,
          inflacao_implicita_1a: infl.implicita,
          inflacao_vertice: null, // interpolado a 1 ano exato, não um vencimento específico
          quadrante,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "country,date" }
      );
      if (upsertError) throw upsertError;

      return new Response(
        JSON.stringify({
          success: true,
          date: today,
          growth_composite: growth.composite,
          growth_series_used: growth.count,
          inflacao_implicita_1a: infl.implicita,
          inflacao_nominal_1y: infl.nominal_1y,
          inflacao_real_1y: infl.real_1y,
          fonte_nominal_data_base: infl.data_nominal,
          fonte_real_data_base: infl.data_real,
          quadrante,
          compared_to: prevRow?.date ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Backfill mode ──
    const fromParam = url.searchParams.get("from") || "2015-01-01";
    const toParam = url.searchParams.get("to") || isoDate(new Date());
    const dates = monthEndDates(fromParam, toParam, MAX_BACKFILL_MONTHS);

    let prevGrowth: number | null = null;
    let prevInfl: number | null = null;
    const results: Array<{ date: string; growth_composite: number | null; inflacao_implicita_1a: number | null; quadrante: string | null }> = [];

    for (const dateIso of dates) {
      const infl = inflacao1Y(rows, dateIso);
      const growth = await growthCompositeAsOf(supabase, dateIso);

      if (!infl) {
        results.push({ date: dateIso, growth_composite: growth.composite, inflacao_implicita_1a: null, quadrante: null });
        continue;
      }

      let quadrante: string | null = null;
      if (growth.composite != null) {
        const growthUp = prevGrowth != null ? growth.composite >= prevGrowth : growth.composite >= 0;
        const inflationUp = prevInfl != null ? infl.implicita >= prevInfl : false;
        quadrante = classifyQuadrante(growthUp, inflationUp);
      }

      const { error: upsertError } = await supabase.from("macro_cycle_history").upsert(
        {
          country: "BR",
          date: dateIso,
          growth_composite: growth.composite,
          growth_series_count: growth.count,
          inflacao_implicita_1a: infl.implicita,
          inflacao_vertice: null,
          quadrante,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "country,date" }
      );
      if (upsertError) console.error(`Backfill upsert error ${dateIso}:`, upsertError.message);

      prevGrowth = growth.composite ?? prevGrowth;
      prevInfl = infl.implicita;
      results.push({ date: dateIso, growth_composite: growth.composite, inflacao_implicita_1a: infl.implicita, quadrante });
    }

    return new Response(
      JSON.stringify({ success: true, months: results.length, from: fromParam, to: toParam, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("sync-macro-cycle error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
