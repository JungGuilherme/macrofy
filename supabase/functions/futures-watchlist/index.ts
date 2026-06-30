const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FuturesQuote {
  symbol: string;
  name: string;
  description: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

const FUTURES_CONFIG: Record<string, { name: string; description: string }> = {
  "ES=F": { name: "S&P 500 Futuro", description: "Futuro do principal índice americano (large caps)" },
  "NQ=F": { name: "Nasdaq 100 Futuro", description: "Futuro do índice de tecnologia dos EUA" },
  "YM=F": { name: "Dow Jones Futuro", description: "Futuro do índice industrial americano (30 blue chips)" },
  "RTY=F": { name: "Russell 2000 Futuro", description: "Futuro do índice de small caps americanas" },
  "NK=F": { name: "Nikkei 225 Futuro", description: "Futuro do principal índice japonês" },
  "CL=F": { name: "Petróleo WTI", description: "Futuro do petróleo West Texas Intermediate" },
  "BZ=F": { name: "Petróleo Brent", description: "Futuro do petróleo Brent (referência global)" },
  "GC=F": { name: "Ouro", description: "Futuro do ouro (referência global de safe haven)" },
  "DX=F": { name: "Índice Dólar (DXY)", description: "Índice do dólar contra cesta de moedas" },
  "^TNX": { name: "Treasury 10Y", description: "Yield do título do Tesouro americano de 10 anos" },
  "^BVSP": { name: "Ibovespa", description: "Principal índice da bolsa brasileira" },
  "BTC-USD": { name: "Bitcoin", description: "Criptomoeda Bitcoin cotada em dólar" },
};

async function fetchYahooQuote(symbol: string): Promise<FuturesQuote | null> {
  const config = FUTURES_CONFIG[symbol];
  if (!config) return null;

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MacrofyBot/1.0)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      symbol,
      name: config.name,
      description: config.description,
      price,
      change,
      changePercent: changePct,
      currency: meta.currency || "USD",
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    const symbols = Object.keys(FUTURES_CONFIG);
    const results = await Promise.all(symbols.map(fetchYahooQuote));
    const quotes = results.filter((q): q is FuturesQuote => q !== null);

    return new Response(
      JSON.stringify({ quotes, updatedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
