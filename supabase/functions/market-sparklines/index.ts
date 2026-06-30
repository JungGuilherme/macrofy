import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SparklineData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  sparkline: number[];
}

const DEFAULT_SYMBOLS: Record<string, { name: string; currency: string }> = {
  "^BVSP": { name: "Ibovespa", currency: "BRL" },
  "^GSPC": { name: "S&P 500", currency: "USD" },
  "USDBRL=X": { name: "Dólar", currency: "BRL" },
};

const PRESETS: Record<string, Record<string, { name: string; currency: string }>> = {
  default: DEFAULT_SYMBOLS,
  global_indices: {
    "^GSPC": { name: "S&P 500", currency: "USD" },
    "^IXIC": { name: "Nasdaq", currency: "USD" },
    "^DJI": { name: "Dow Jones", currency: "USD" },
    "^GDAXI": { name: "DAX", currency: "EUR" },
    "^FTSE": { name: "FTSE 100", currency: "GBP" },
    "^N225": { name: "Nikkei 225", currency: "JPY" },
  },
};

let SYMBOLS: Record<string, { name: string; currency: string }> = DEFAULT_SYMBOLS;

async function fetchYahooChart(symbol: string): Promise<SparklineData | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const timestamps = result.timestamp as number[] | undefined;
    const closes = result.indicators?.quote?.[0]?.close as (number | null)[] | undefined;

    const now = new Date();
    const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    const filteredCloses = (timestamps || []).reduce<number[]>((acc, ts, index) => {
      const close = closes?.[index];
      if (close === null || close === undefined) return acc;
      const date = new Date(ts * 1000);
      const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
      if (dateKey === todayKey) acc.push(close);
      return acc;
    }, []);

    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // Build sparkline from close prices, filtering nulls
    const sparkline = filteredCloses.length > 1
      ? filteredCloses
      : (closes || []).filter((v): v is number => v !== null && v !== undefined);

    const info = SYMBOLS[symbol] || { name: symbol, currency: "USD" };

    return {
      symbol,
      name: info.name,
      price,
      change,
      changePercent,
      currency: info.currency,
      sparkline,
    };
  } catch {
    return null;
  }
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
    const url = new URL(req.url);
    let preset = url.searchParams.get("preset") || "default";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.preset) preset = body.preset;
      } catch {}
    }
    SYMBOLS = PRESETS[preset] || DEFAULT_SYMBOLS;

    const results = await Promise.all(
      Object.keys(SYMBOLS).map((sym) => fetchYahooChart(sym))
    );

    const quotes = results.filter(Boolean);

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
