import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

const SERIES = [
  { id: "DGS1MO", years: 0.083, label: "1M" },
  { id: "DGS3MO", years: 0.25, label: "3M" },
  { id: "DGS6MO", years: 0.5, label: "6M" },
  { id: "DGS1", years: 1, label: "1Y" },
  { id: "DGS2", years: 2, label: "2Y" },
  { id: "DGS3", years: 3, label: "3Y" },
  { id: "DGS5", years: 5, label: "5Y" },
  { id: "DGS7", years: 7, label: "7Y" },
  { id: "DGS10", years: 10, label: "10Y" },
  { id: "DGS20", years: 20, label: "20Y" },
  { id: "DGS30", years: 30, label: "30Y" },
];

// Simple cache: 15 min per date
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000;

interface CurvePoint {
  years: number;
  yield: number;
  label: string;
}

async function fetchSeries(seriesId: string, date: string, apiKey: string): Promise<number | null> {
  // Fetch a window around the date to handle weekends/holidays
  const d = new Date(date);
  const start = new Date(d);
  start.setDate(start.getDate() - 7);
  const startStr = start.toISOString().split("T")[0];

  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startStr}&observation_end=${date}&sort_order=desc&limit=1`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`FRED error for ${seriesId}: ${res.status}`);
    await res.text();
    return null;
  }

  const json = await res.json();
  const obs = json.observations;
  if (!obs || obs.length === 0) return null;

  const val = parseFloat(obs[0].value);
  return isNaN(val) ? null : val;
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
    const apiKey = Deno.env.get("FRED_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "FRED_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Check cache
    const cacheKey = `us-${date}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all series in parallel
    const results = await Promise.all(
      SERIES.map(async (s) => {
        const yieldVal = await fetchSeries(s.id, date, apiKey);
        return { ...s, yield: yieldVal };
      })
    );

    const points: CurvePoint[] = results
      .filter((r) => r.yield !== null)
      .map((r) => ({
        years: r.years,
        yield: r.yield!,
        label: r.label,
      }));

    // Find actual date used (from FRED response - re-fetch one to get the date)
    let actualDate = date;
    if (points.length > 0) {
      // Quick fetch to get actual observation date
      const checkUrl = `${FRED_BASE}?series_id=DGS10&api_key=${apiKey}&file_type=json&observation_start=${new Date(new Date(date).getTime() - 7 * 86400000).toISOString().split("T")[0]}&observation_end=${date}&sort_order=desc&limit=1`;
      const checkRes = await fetch(checkUrl);
      if (checkRes.ok) {
        const checkJson = await checkRes.json();
        if (checkJson.observations?.length > 0) {
          actualDate = checkJson.observations[0].date;
        }
      } else {
        await checkRes.text();
      }
    }

    const response = {
      country: "US",
      date: actualDate,
      points,
    };

    cache.set(cacheKey, { data: response, ts: Date.now() });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in us-treasury-curve:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
