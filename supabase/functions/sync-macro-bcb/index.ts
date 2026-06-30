import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Series where raw_value IS already a % variation (e.g. IPCA monthly)
// For these, M/M of the value makes no sense (would be change-of-change)
const RAW_IS_VARIATION = new Set(['433', '7478', '11427', '10844']);

function computeDerived(values: number[], idx: number, polarity: string, seriesCode: string) {
  const val = values[idx];
  const isRawVar = RAW_IS_VARIATION.has(seriesCode);

  let mom: number | null = null;
  if (!isRawVar && idx > 0 && values[idx - 1] !== 0) {
    mom = ((val - values[idx - 1]) / Math.abs(values[idx - 1])) * 100;
  }

  let yoy: number | null = null;
  if (!isRawVar && idx >= 12 && values[idx - 12] !== 0) {
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

  // Z-score using full available window (up to 60 months)
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
  if (unit === "index" || unit === "pts") return value.toFixed(1);
  if (unit === "R$") return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (Math.abs(value) >= 1000) return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: series } = await supabase
      .from("macro_series_metadata")
      .select("*")
      .eq("country", "BR")
      .eq("source", "BCB")
      .eq("enabled", true);

    if (!series?.length) {
      return new Response(JSON.stringify({ message: "No BCB series to sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ series: string; rows?: number; error?: string }> = [];

    for (const s of series) {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 5);

        const fmt = (d: Date) =>
          `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

        const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.series_code}/dados?formato=json&dataInicial=${fmt(startDate)}&dataFinal=${fmt(endDate)}`;

        const res = await fetch(url);
        if (!res.ok) {
          await res.text();
          results.push({ series: s.series_code, error: `HTTP ${res.status}` });
          continue;
        }

        const rawData = await res.json();
        if (!Array.isArray(rawData) || rawData.length === 0) {
          results.push({ series: s.series_code, error: "No data returned" });
          continue;
        }

        // Parse dates (DD/MM/YYYY) and values
        const parsed = rawData
          .map((d: { data: string; valor: string }) => {
            const parts = d.data.split("/");
            const date = `${parts[2]}-${parts[1]}-${parts[0]}`;
            const value = parseFloat(String(d.valor).replace(",", "."));
            return { date, value: isNaN(value) ? null : value };
          })
          .filter((d: { value: number | null }) => d.value !== null);

        // Aggregate to monthly (last value of each month)
        const monthly = new Map<string, number>();
        for (const p of parsed) {
          const monthKey = p.date.substring(0, 7);
          monthly.set(monthKey, p.value!);
        }

        const sortedMonths = Array.from(monthly.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const values = sortedMonths.map(([_, v]) => v);

        const rows = sortedMonths.map(([monthKey, value], idx) => {
          const derived = computeDerived(values, idx, s.polarity, s.series_code);
          return {
            country: s.country,
            category: s.category,
            indicator: s.indicator,
            source: s.source,
            series_code: s.series_code,
            date: `${monthKey}-01`,
            frequency: "monthly",
            unit: s.unit,
            raw_value: value,
            display_value: formatValue(value, s.unit),
            calc_mode: "level",
            ...derived,
            polarity: s.polarity,
            last_updated_at: new Date().toISOString(),
          };
        });

        // Keep last 36 months
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
    console.error("sync-macro-bcb error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
