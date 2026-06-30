import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TickerQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
}

// brapi symbols
const BRAPI_QUOTES = [
  { symbol: "^BVSP", name: "Ibovespa" },
  { symbol: "IFIX", name: "IFIX" },
];

// Global symbols via brapi quote endpoint (supports international tickers)
const BRAPI_GLOBAL = [
  { symbol: "USDBRL", name: "Dólar", isCurrency: true },
];

// Fallback static config for displaying tickers we can't fetch
const GLOBAL_TICKERS = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "Nasdaq" },
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "BTC-USD", name: "Bitcoin" },
  { symbol: "ETH-USD", name: "Ethereum" },
  { symbol: "GC=F", name: "Ouro" },
  { symbol: "BZ=F", name: "Brent" },
];

async function fetchBrapi(token: string): Promise<TickerQuote[]> {
  const results: TickerQuote[] = [];

  // Fetch BR quotes
  for (const { symbol, name } of BRAPI_QUOTES) {
    try {
      const res = await fetch(`https://brapi.dev/api/quote/${symbol}?token=${token}`);
      if (!res.ok) continue;
      const data = await res.json();
      const quote = data?.results?.[0];
      if (quote) {
        results.push({
          symbol,
          name,
          price: quote.regularMarketPrice || 0,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          currency: "BRL",
        });
      }
    } catch { /* skip */ }
  }

  // Fetch USD/BRL currency
  try {
    const res = await fetch(`https://brapi.dev/api/v2/currency?currency=USD-BRL&token=${token}`);
    if (res.ok) {
      const data = await res.json();
      const curr = data?.currency?.[0];
      if (curr) {
        results.push({
          symbol: "USDBRL",
          name: "Dólar",
          price: parseFloat(curr.bidPrice) || 0,
          change: parseFloat(curr.bidVariation) || 0,
          changePercent: parseFloat(curr.pctChange) || 0,
          currency: "BRL",
        });
      }
    }
  } catch { /* skip */ }

  return results;
}

async function fetchGlobalViaBrapi(token: string): Promise<TickerQuote[]> {
  const results: TickerQuote[] = [];
  
  // brapi supports some global tickers via quote endpoint
  const globalSymbols = [
    { symbol: "AAPL34", name: "S&P 500", map: "^GSPC" },
  ];

  // Try fetching global data from a free API (exchangerate + crypto)
  // Crypto via CoinGecko free API
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
    );
    if (res.ok) {
      const data = await res.json();
      if (data.bitcoin) {
        results.push({
          symbol: "BTC-USD",
          name: "Bitcoin",
          price: data.bitcoin.usd || 0,
          change: 0,
          changePercent: data.bitcoin.usd_24h_change || 0,
          currency: "USD",
        });
      }
      if (data.ethereum) {
        results.push({
          symbol: "ETH-USD",
          name: "Ethereum",
          price: data.ethereum.usd || 0,
          change: 0,
          changePercent: data.ethereum.usd_24h_change || 0,
          currency: "USD",
        });
      }
    }
  } catch { /* skip */ }

  // Try Yahoo Finance v8 (more reliable endpoint)
  const yahooSymbols = ["^GSPC", "^IXIC", "^DJI", "GC=F", "BZ=F"];
  const yahooNames: Record<string, string> = {
    "^GSPC": "S&P 500",
    "^IXIC": "Nasdaq",
    "^DJI": "Dow Jones",
    "GC=F": "Ouro",
    "BZ=F": "Brent",
  };

  for (const sym of yahooSymbols) {
    try {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta) {
        const price = meta.regularMarketPrice || 0;
        const prevClose = meta.chartPreviousClose || meta.previousClose || price;
        const change = price - prevClose;
        const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
        results.push({
          symbol: sym,
          name: yahooNames[sym] || sym,
          price,
          change,
          changePercent: changePct,
          currency: meta.currency || "USD",
        });
      }
    } catch { /* skip */ }
  }

  return results;
}

serve(async (req) => {
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
    const brapiToken = Deno.env.get("BRAPI_TOKEN") || "";

    const [brapiQuotes, globalQuotes] = await Promise.all([
      fetchBrapi(brapiToken),
      fetchGlobalViaBrapi(brapiToken),
    ]);

    const quotes = [...brapiQuotes, ...globalQuotes];

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
