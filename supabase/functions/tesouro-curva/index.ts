import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TESOURO_CSV_URL = "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

// Simple in-memory cache (15 min)
let csvCache: { data: string; timestamp: number } | null = null;
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

async function fetchCSV(): Promise<string> {
  const now = Date.now();
  if (csvCache && now - csvCache.timestamp < CACHE_TTL_MS) {
    console.log("Using cached CSV data");
    return csvCache.data;
  }

  console.log("Fetching fresh CSV from Tesouro Transparente...");
  const response = await fetch(TESOURO_CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status}`);
  }
  const data = await response.text();
  csvCache = { data, timestamp: now };
  return data;
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

    const patterns = TIPO_PATTERNS[tipo];

    // Fetch and parse CSV
    const csvData = await fetchCSV();
    const lines = csvData.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      return new Response(
        JSON.stringify({ error: "CSV vazio ou inválido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse header to find column indices
    const header = parseCSVLine(lines[0]);
    const colIndices: Record<string, number> = {};
    header.forEach((col, idx) => {
      colIndices[col] = idx;
    });

    const tipoTituloIdx = colIndices["Tipo Titulo"];
    const dataBaseIdx = colIndices["Data Base"];
    const dataVencimentoIdx = colIndices["Data Vencimento"];
    const taxaColunaIdx = colIndices[TAXA_COLUNA];

    if (tipoTituloIdx === undefined || dataBaseIdx === undefined || dataVencimentoIdx === undefined) {
      return new Response(
        JSON.stringify({ error: "Colunas obrigatórias não encontradas no CSV" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (taxaColunaIdx === undefined) {
      return new Response(
        JSON.stringify({ error: `Coluna de taxa não encontrada: ${TAXA_COLUNA}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse all data rows
    interface DataRow {
      tipoTitulo: string;
      dataBase: Date;
      dataVencimento: Date;
      taxa: number;
    }

    const allData: DataRow[] = [];
    const availableDates = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < Math.max(tipoTituloIdx, dataBaseIdx, dataVencimentoIdx, taxaColunaIdx) + 1) {
        continue;
      }

      const tipoTitulo = cols[tipoTituloIdx];
      const dataBase = parseDate(cols[dataBaseIdx]);
      const dataVencimento = parseDate(cols[dataVencimentoIdx]);
      const taxaValue = parseNumber(cols[taxaColunaIdx]);

      if (!dataBase || !dataVencimento || taxaValue === null) continue;

      // Check if title matches the requested type
      const matches = patterns.some((pattern) => tipoTitulo.includes(pattern));
      if (!matches) continue;

      availableDates.add(formatDate(dataBase));
      allData.push({
        tipoTitulo,
        dataBase,
        dataVencimento,
        taxa: taxaValue,
      });
    }

    // Find the best date (exact match or closest previous)
    const requestedDate = new Date(dataParam);
    let usedDate: Date | null = null;

    // Sort available dates descending
    const sortedDates = Array.from(availableDates)
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    for (const d of sortedDates) {
      if (d <= requestedDate) {
        usedDate = d;
        break;
      }
    }

    if (!usedDate && sortedDates.length > 0) {
      // If requested date is before all available, use the earliest
      usedDate = sortedDates[sortedDates.length - 1];
    }

    if (!usedDate) {
      return new Response(
        JSON.stringify({ error: "Nenhuma data disponível para o tipo selecionado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const usedDateStr = formatDate(usedDate);

    // Filter data for the used date
    const filteredData = allData.filter((row) => formatDate(row.dataBase) === usedDateStr);

    // Group by vencimento date (use full date for accurate grouping)
    const pointsMap = new Map<string, { taxas: number[]; vencimento: Date }>();

    for (const row of filteredData) {
      const diffMs = row.dataVencimento.getTime() - row.dataBase.getTime();
      const anos = diffMs / (365 * 24 * 60 * 60 * 1000);

      if (anos <= 0) continue;

      // Use vencimento date as key for grouping
      const vencKey = formatDate(row.dataVencimento);

      const existing = pointsMap.get(vencKey);
      if (existing) {
        existing.taxas.push(row.taxa);
      } else {
        pointsMap.set(vencKey, { taxas: [row.taxa], vencimento: row.dataVencimento });
      }
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
