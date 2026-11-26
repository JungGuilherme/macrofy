import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TESOURO_CSV_URL = "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

// Simple in-memory cache (15 min)
const CACHE_TTL_MS = 15 * 60 * 1000;

// Map tipo to title patterns
const TIPO_PATTERNS: Record<string, string[]> = {
  PREFIXADA: ["Tesouro Prefixado"],
  IPCA: ["Tesouro IPCA+", "Tesouro IPCA+ com Juros"],
  SELIC: ["Tesouro Selic"],
  IGPM: ["Tesouro IGPM+ com Juros"],
};

// Fixed to COMPRA_MANHA - no longer configurable
const TAXA_COLUNA = "Taxa Compra Manha";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ";" && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Format: DD/MM/YYYY
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month, day);
}

function parseNumber(numStr: string): number | null {
  if (!numStr || numStr.trim() === "") return null;
  // Replace comma with dot for decimal
  const normalized = numStr.replace(",", ".");
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

function formatDateBR(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatVencimentoLabel(date: Date): string {
  const month = MONTH_NAMES[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

// ── Compact, shared index ────────────────────────────────────────────────
// The Tesouro CSV covers every title since 2002 and keeps growing. Parsing it
// in full on every request (and once per parallel request) started blowing the
// edge function CPU/memory budget (HTTP 546 WORKER_RESOURCE_LIMIT), so the
// latest curves stopped loading. We now parse it ONCE per isolate into a small
// index { tipo -> dataBase(YYYY-MM-DD) -> rows }, and concurrent requests share
// the same in-flight build.

interface IndexRow {
  venc: string; // YYYY-MM-DD
  taxa: number;
}
type TipoIndex = Map<string, IndexRow[]>; // dataBase -> rows
type CurveIndex = Record<string, TipoIndex>;

let indexCache: { index: CurveIndex; timestamp: number } | null = null;
let indexBuild: Promise<CurveIndex> | null = null;

/** DD/MM/YYYY -> YYYY-MM-DD without allocating Date objects. */
function brToIso(s: string): string | null {
  if (s.length < 10 || s[2] !== "/" || s[5] !== "/") return null;
  return `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}`;
}

function tipoOf(tipoTitulo: string): string | null {
  for (const [tipo, patterns] of Object.entries(TIPO_PATTERNS)) {
    if (patterns.some((p) => tipoTitulo.includes(p))) return tipo;
  }
  return null;
}

async function buildIndex(): Promise<CurveIndex> {
  console.log("Fetching fresh CSV from Tesouro Transparente...");
  const response = await fetch(TESOURO_CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status}`);
  }
  const csv = await response.text();

  let pos = csv.indexOf("\n");
  if (pos < 0) throw new Error("CSV vazio ou inválido");
  const header = parseCSVLine(csv.slice(0, pos).replace(/\r$/, ""));
  const tipoIdx = header.indexOf("Tipo Titulo");
  const baseIdx = header.indexOf("Data Base");
  const vencIdx = header.indexOf("Data Vencimento");
  const taxaIdx = header.indexOf(TAXA_COLUNA);
  if (tipoIdx < 0 || baseIdx < 0 || vencIdx < 0) {
    throw new Error("Colunas obrigatórias não encontradas no CSV");
  }
  if (taxaIdx < 0) throw new Error(`Coluna de taxa não encontrada: ${TAXA_COLUNA}`);
  const minCols = Math.max(tipoIdx, baseIdx, vencIdx, taxaIdx) + 1;

  const index: CurveIndex = {};
  for (const tipo of Object.keys(TIPO_PATTERNS)) index[tipo] = new Map();
  const tipoCache = new Map<string, string | null>();

  // Walk the string line by line (no giant split array). This CSV has no
  // quoted fields, so a plain split(";") per line is safe and much cheaper.
  while (pos >= 0 && pos < csv.length) {
    const next = csv.indexOf("\n", pos + 1);
    const line = csv.slice(pos + 1, next < 0 ? csv.length : next);
    pos = next;
    if (line.length < 10) continue;
    const cols = (line.includes('"') ? line.replace(/"/g, "") : line).split(";");
    if (cols.length < minCols) continue;

    const tipoTitulo = cols[tipoIdx].trim();
    let tipo = tipoCache.get(tipoTitulo);
    if (tipo === undefined) {
      tipo = tipoOf(tipoTitulo);
      tipoCache.set(tipoTitulo, tipo);
    }
    if (!tipo) continue;

    const base = brToIso(cols[baseIdx].trim());
    const venc = brToIso(cols[vencIdx].trim());
    const taxa = parseNumber(cols[taxaIdx]);
    if (!base || !venc || taxa === null) continue;

    const byDate = index[tipo];
    const rows = byDate.get(base);
    if (rows) rows.push({ venc, taxa });
    else byDate.set(base, [{ venc, taxa }]);
  }
  return index;
}

async function getIndex(): Promise<CurveIndex> {
  if (indexCache && Date.now() - indexCache.timestamp < CACHE_TTL_MS) {
    return indexCache.index;
  }
  if (!indexBuild) {
    indexBuild = buildIndex()
      .then((index) => {
        indexCache = { index, timestamp: Date.now() };
        return index;
      })
      .finally(() => {
        indexBuild = null;
      });
  }
  try {
    return await indexBuild;
  } catch (err) {
    // Tesouro site down: serve the stale index rather than failing.
    if (indexCache) return indexCache.index;
    throw err;
  }
}

function isoToDate(iso: string): Date {
  return new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
}

interface CurvePoint {
  anos: number;
  taxa: number;
  vencimento: string;
  vencimento_ano: number;
  vencimento_label: string;
}

interface CurveResponse {
  tipo: string;
  data_base_usada: string;
  taxa_coluna: string;
  pontos: CurvePoint[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth gate: require valid JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await sb.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  try {
    const url = new URL(req.url);
    const tipo = url.searchParams.get("tipo")?.toUpperCase() || "PREFIXADA";
    const dataParam = url.searchParams.get("data") || formatDate(new Date());
    // taxa parameter is now ignored - always use COMPRA_MANHA

    // Validate parameters
    if (!TIPO_PATTERNS[tipo]) {
      return new Response(
        JSON.stringify({ error: `Tipo inválido: ${tipo}. Use PREFIXADA, IPCA, SELIC ou IGPM.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const byDate = (await getIndex())[tipo];
    const sortedDates = Array.from(byDate.keys()).sort().reverse(); // ISO strings sort chronologically

    // Exact date or closest previous; if before all available, use the earliest.
    const wanted = dataParam.slice(0, 10);
    const usedIso = sortedDates.find((d) => d <= wanted) ?? sortedDates[sortedDates.length - 1];

    if (!usedIso) {
      return new Response(
        JSON.stringify({ error: "Nenhuma data disponível para o tipo selecionado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const usedDate = isoToDate(usedIso);

    const usedDateStr = formatDate(usedDate);

    // Group by vencimento date
    const pointsMap = new Map<string, { taxas: number[]; vencimento: Date }>();
    for (const row of byDate.get(usedIso) ?? []) {
      if (row.venc <= usedIso) continue; // already matured
      const existing = pointsMap.get(row.venc);
      if (existing) existing.taxas.push(row.taxa);
      else pointsMap.set(row.venc, { taxas: [row.taxa], vencimento: isoToDate(row.venc) });
    }

    // Calculate averages and build response
    const pontos: CurvePoint[] = [];
    for (const [_, data] of pointsMap.entries()) {
      const avgTaxa = data.taxas.reduce((a, b) => a + b, 0) / data.taxas.length;
      const diffMs = data.vencimento.getTime() - usedDate.getTime();
      const anos = Math.round((diffMs / (365 * 24 * 60 * 60 * 1000)) * 100) / 100;
      
      pontos.push({
        anos,
        taxa: Math.round(avgTaxa * 100) / 100,
        vencimento: formatDateBR(data.vencimento),
        vencimento_ano: data.vencimento.getFullYear(),
        vencimento_label: formatVencimentoLabel(data.vencimento),
      });
    }

    // Sort by vencimento_ano then by anos
    pontos.sort((a, b) => a.vencimento_ano - b.vencimento_ano || a.anos - b.anos);

    const response: CurveResponse = {
      tipo,
      data_base_usada: usedDateStr,
      taxa_coluna: TAXA_COLUNA,
      pontos,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in tesouro-curva:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
