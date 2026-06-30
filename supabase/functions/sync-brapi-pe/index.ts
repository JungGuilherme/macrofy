import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Proxy basket: top liquid Brazilian stocks
const BASKET_TICKERS = [
  "PETR4", "VALE3", "ITUB4", "BBDC4", "ABEV3",
  "WEGE3", "RENT3", "BBAS3", "SUZB3", "JBSS3",
];

interface BrapiQuote {
  symbol: string;
  regularMarketPrice?: number;
  priceEarnings?: number;
  earningsPerShare?: number;
  historicalDataPrice?: Array<{
    date: number;
    close: number;
  }>;
}

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


  const BRAPI_TOKEN = Deno.env.get("BRAPI_TOKEN");
  if (!BRAPI_TOKEN) {
    return new Response(
      JSON.stringify({ error: "BRAPI_TOKEN not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Step 1: Fetch current fundamentals for all basket tickers
    const tickerList = BASKET_TICKERS.join(",");
    const fundamentalUrl = `https://brapi.dev/api/quote/${tickerList}?fundamental=true&token=${BRAPI_TOKEN}`;
    
    console.log(`Fetching fundamentals for: ${tickerList}`);
    const fundRes = await fetch(fundamentalUrl);
    if (!fundRes.ok) {
      const errText = await fundRes.text();
      throw new Error(`brapi fundamentals failed [${fundRes.status}]: ${errText}`);
    }

    const fundData = await fundRes.json();
    const quotes: BrapiQuote[] = fundData.results || [];

    // Filter stocks that have valid P/E
    const validQuotes = quotes.filter(
      (q) => q.priceEarnings && q.priceEarnings > 0 && q.priceEarnings < 200
    );

    if (validQuotes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid P/E data from brapi", quotes: quotes.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Calculate current aggregate P/E (equal-weighted average)
    const currentPE =
      validQuotes.reduce((sum, q) => sum + (q.priceEarnings || 0), 0) /
      validQuotes.length;

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

    console.log(`Current aggregate P/E: ${currentPE.toFixed(2)} from ${validQuotes.length} stocks`);

    // Step 3: Fetch historical prices for each ticker to build historical P/E proxy
    // We'll use the current EPS and apply it to historical prices to estimate historical P/E
    const historicalPE: Map<string, number[]> = new Map();

    for (const quote of validQuotes) {
      const eps = quote.earningsPerShare;
      if (!eps || eps <= 0) continue;

      try {
        const histUrl = `https://brapi.dev/api/quote/${quote.symbol}?range=3y&interval=1mo&token=${BRAPI_TOKEN}`;
        const histRes = await fetch(histUrl);
        if (!histRes.ok) {
          console.warn(`History failed for ${quote.symbol}`);
          await histRes.text();
          continue;
        }

        const histData = await histRes.json();
        const history = histData.results?.[0]?.historicalDataPrice || [];

        for (const point of history) {
          if (!point.close || point.close <= 0) continue;
          const d = new Date(point.date * 1000);
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
          const pe = point.close / eps;
          if (pe > 0 && pe < 200) {
            if (!historicalPE.has(monthKey)) historicalPE.set(monthKey, []);
            historicalPE.get(monthKey)!.push(pe);
          }
        }
      } catch (e) {
        console.warn(`Error fetching history for ${quote.symbol}:`, e);
      }
    }

    // Step 4: Aggregate monthly P/E averages
    const monthlyData: Array<{ date: string; pe_ratio: number }> = [];

    for (const [month, values] of historicalPE.entries()) {
      if (values.length < 3) continue; // Need at least 3 stocks for meaningful average
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      monthlyData.push({ date: month, pe_ratio: +avg.toFixed(2) });
    }

    // Also add/update current month with the fundamental-based P/E
    const existingCurrent = monthlyData.find((d) => d.date === currentMonth);
    if (existingCurrent) {
      existingCurrent.pe_ratio = +currentPE.toFixed(2);
    } else {
      monthlyData.push({ date: currentMonth, pe_ratio: +currentPE.toFixed(2) });
    }

    monthlyData.sort((a, b) => a.date.localeCompare(b.date));

    // Keep only last 36 months
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 36);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-01`;
    const filtered = monthlyData.filter((d) => d.date >= cutoffStr);

    if (filtered.length === 0) {
      return new Response(
        JSON.stringify({ error: "No historical data points generated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Upserting ${filtered.length} monthly P/E data points`);

    // Step 5: Upsert into brasil_pe_historico
    for (const row of filtered) {
      const { error } = await supabase
        .from("brasil_pe_historico")
        .upsert(
          { date: row.date, pe_ratio: row.pe_ratio, source: "brapi-proxy" },
          { onConflict: "date" }
        );
      if (error) {
        console.warn(`Upsert error for ${row.date}:`, error.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        points: filtered.length,
        current_pe: +currentPE.toFixed(2),
        basket_size: validQuotes.length,
        tickers: validQuotes.map((q) => q.symbol),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("sync-brapi-pe error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
