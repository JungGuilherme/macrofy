import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

function computeDerived(values: number[], idx: number, polarity: string) {
  const val = values[idx];

  let mom: number | null = null;
  if (idx > 0 && values[idx - 1] !== 0) {
    mom = ((val - values[idx - 1]) / Math.abs(values[idx - 1])) * 100;
  }

  let yoy: number | null = null;
  if (idx >= 12 && values[idx - 12] !== 0) {
    yoy = ((val - values[idx - 12]) / Math.abs(values[idx - 12])) * 100;
  }

  let ma3: number | null = null;
  if (idx >= 2) {
    ma3 = (values[idx] + values[idx - 1] + values[idx - 2]) / 3;
  }

  let ma12: number | null = null;
  if (idx >= 11) {
    ma12 = values.slice(idx - 11, idx + 1).reduce((a, b) => a + b, 0) / 12;
  }

  let heatScore: number | null = null;
  const window = values.slice(Math.max(0, idx - 59), idx + 1);
  if (window.length >= 6) {
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const std = Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length);
    if (std > 0.0001) {
      heatScore = (val - mean) / std;
      if (polarity === "negative") heatScore = -heatScore;
    }
  }

  return {
    mom_value: mom !== null ? parseFloat(mom.toFixed(4)) : null,
    yoy_value: yoy !== null ? parseFloat(yoy.toFixed(4)) : null,
    ma3_value: ma3 !== null ? parseFloat(ma3.toFixed(4)) : null,
    ma12_value: ma12 !== null ? parseFloat(ma12.toFixed(4)) : null,
    heat_score: heatScore !== null ? parseFloat(heatScore.toFixed(4)) : null,
  };
}

function formatValue(value: number, unit: string): string {
  if (unit === "%") return `${value.toFixed(2)}%`;
  if (unit === "index") return value.toFixed(1);
  if (unit === "USD bn") return `$${(value / 1).toFixed(1)}B`;
  if (unit === "USD mn") return `$${(value / 1).toFixed(0)}M`;
  if (unit === "USD") return `$${value.toFixed(2)}`;
  if (unit === "k") return value.toFixed(0);
  if (Math.abs(value) >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return value.toFixed(2);
}

serve(async (req) => {
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
    const apiKey = Deno.env.get("FRED_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "FRED_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: series } = await supabase
      .from("macro_series_metadata")
      .select("*")
      .eq("country", "US")
      .eq("source", "FRED")
      .eq("enabled", true);

    if (!series?.length) {
      return new Response(JSON.stringify({ message: "No FRED series to sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ series: string; rows?: number; error?: string }> = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);
    const startStr = startDate.toISOString().split("T")[0];

    for (const s of series) {
      try {
        const url = `${FRED_BASE}?series_id=${s.series_code}&api_key=${apiKey}&file_type=json&observation_start=${startStr}`;

        const res = await fetch(url);
        if (!res.ok) {
          await res.text();
          results.push({ series: s.series_code, error: `HTTP ${res.status}` });
          continue;
        }

        const json = await res.json();
        const obs = json.observations;
        if (!obs || obs.length === 0) {
          results.push({ series: s.series_code, error: "No observations" });
          continue;
        }

        // Parse observations
        const parsed = obs
          .map((o: { date: string; value: string }) => ({
            date: o.date,
            value: parseFloat(o.value),
          }))
          .filter((o: { value: number }) => !isNaN(o.value));

        // Aggregate to monthly (last value of each month)
        const monthly = new Map<string, number>();
        for (const p of parsed) {
          const monthKey = p.date.substring(0, 7);
          monthly.set(monthKey, p.value);
        }

        // For quarterly series, carry forward to monthly
        if (s.frequency === "quarterly") {
          const sortedKeys = Array.from(monthly.keys()).sort();
          if (sortedKeys.length > 0) {
            const firstDate = new Date(sortedKeys[0] + "-01");
            const lastDate = new Date(sortedKeys[sortedKeys.length - 1] + "-01");
            let currentDate = new Date(firstDate);
            let lastValue = monthly.get(sortedKeys[0])!;

            while (currentDate <= lastDate) {
              const key = currentDate.toISOString().substring(0, 7);
              if (monthly.has(key)) {
                lastValue = monthly.get(key)!;
              } else {
                monthly.set(key, lastValue);
              }
              currentDate.setMonth(currentDate.getMonth() + 1);
            }
          }
        }

        const sortedMonths = Array.from(monthly.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const values = sortedMonths.map(([_, v]) => v);

        const rows = sortedMonths.map(([monthKey, value], idx) => {
          const derived = computeDerived(values, idx, s.polarity);
          return {
            country: s.country,
            category: s.category,
            indicator: s.indicator,
            source: s.source,
            series_code: s.series_code,
            date: `${monthKey}-01`,
            frequency: s.frequency === "quarterly" ? "quarterly" : "monthly",
            unit: s.unit,
            raw_value: value,
            display_value: formatValue(value, s.unit),
            calc_mode: "level",
            ...derived,
            polarity: s.polarity,
            last_updated_at: new Date().toISOString(),
          };
        });

        const recentRows = rows.slice(-36);

        for (let i = 0; i < recentRows.length; i += 100) {
          const batch = recentRows.slice(i, i + 100);
          const { error } = await supabase
            .from("macro_heatmap_data")
            .upsert(batch, { onConflict: "country,series_code,date" });
          if (error) console.error(`Upsert error ${s.series_code}:`, error);
        }

        results.push({ series: s.series_code, rows: recentRows.length });
      } catch (err) {
        results.push({ series: s.series_code, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ synced: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("sync-macro-fred error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
