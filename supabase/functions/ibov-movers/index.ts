// Returns top 3 gainers/losers among IBOV constituents using Yahoo Finance public chart endpoint.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Current IBOV constituents (Bovespa Index). Maintained list — update if composition changes.
const IBOV_TICKERS = [
  "ALOS3","ABEV3","ASAI3","AURE3","AZUL4","AZZA3","B3SA3","BBAS3","BBDC3","BBDC4",
  "BBSE3","BEEF3","BPAC11","BPAN4","BRAP4","BRAV3","BRFS3","BRKM5","CCRO3","CMIG4",
  "CMIN3","COGN3","CPFE3","CPLE6","CRFB3","CSAN3","CSNA3","CVCB3","CXSE3","CYRE3",
  "DIRR3","ELET3","ELET6","EMBR3","ENEV3","ENGI11","EQTL3","FLRY3","GGBR4","GOAU4",
  "HAPV3","HYPE3","IGTI11","IRBR3","ISAE4","ITSA4","ITUB4","JBSS3","KLBN11","LREN3",
  "MGLU3","MOTV3","MRFG3","MRVE3","MULT3","NATU3","PCAR3","PETR3","PETR4","PETZ3",
  "POMO4","PRIO3","PSSA3","RADL3","RAIL3","RAIZ4","RDOR3","RECV3","RENT3","SANB11",
  "SBSP3","SLCE3","SMFT3","SMTO3","STBP3","SUZB3","TAEE11","TIMS3","TOTS3","UGPA3",
  "USIM5","VALE3","VAMO3","VBBR3","VIVA3","VIVT3","WEGE3","YDUQ3",
];

interface Mover {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
}

async function fetchOne(ticker: string): Promise<Mover | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.SA?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose;
    if (typeof price !== "number" || typeof prev !== "number" || prev === 0) return null;
    return {
      ticker,
      name: meta.longName || meta.shortName || ticker,
      price,
      changePercent: ((price / prev) - 1) * 100,
    };
  } catch {
    return null;
  }
}

// Run a list of async tasks with limited concurrency.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

Deno.serve(async (req) => {
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
    const raw = await mapWithConcurrency(IBOV_TICKERS, 12, fetchOne);
    const movers = raw.filter((m): m is Mover => m !== null);
    const sorted = [...movers].sort((a, b) => b.changePercent - a.changePercent);
    const gainers = sorted.slice(0, 3);
    const losers = [...sorted].reverse().slice(0, 3);

    return new Response(
      JSON.stringify({
        gainers,
        losers,
        updatedAt: new Date().toISOString(),
        sampled: movers.length,
        total: IBOV_TICKERS.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
