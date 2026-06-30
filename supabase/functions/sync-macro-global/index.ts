import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── BR series mapping ── */
const BR_SERIES: Record<string, string> = {
  "24364": "gdp_yoy",   // IBC-Br → yoy_value
  "13522": "cpi_yoy",   // IPCA 12m → raw_value
  "432": "policy_rate",  // Selic Meta → raw_value
  "24369": "unemployment", // Desocupação → raw_value
  "13762": "govt_debt_gdp", // Dívida/PIB → raw_value
};
const BR_YOY_SERIES = new Set(["24364"]); // series where we use yoy_value

/* ── US series mapping ── */
const US_SERIES: Record<string, string> = {
  "GDPC1": "gdp_yoy",      // Real GDP → yoy_value
  "CPIAUCSL": "cpi_yoy",   // CPI → yoy_value
  "CPILFESL": "core_cpi_yoy", // Core CPI → yoy_value
  "DFEDTARU": "policy_rate",   // Fed Funds Target Upper → raw_value
  "UNRATE": "unemployment",    // Unemployment → raw_value
};
const US_YOY_SERIES = new Set(["GDPC1", "CPIAUCSL", "CPILFESL"]);

/* ── World Bank indicators for other countries ── */
const WB_INDICATORS: Record<string, string> = {
  "NY.GDP.MKTP.KD.ZG": "gdp_yoy",
  "FP.CPI.TOTL.ZG": "cpi_yoy",
  "SL.UEM.TOTL.ZS": "unemployment",
  "GC.DOD.TOTL.GD.ZS": "govt_debt_gdp",
  "BN.CAB.XOKA.GD.ZS": "current_account_gdp",
};

/* ── Country ISO2 codes for World Bank ── */
const WB_COUNTRIES: Record<string, string> = {
  XC: "XC", // Euro Area
  CHN: "CN",
  JPN: "JP",
  DEU: "DE",
  GBR: "GB",
  FRA: "FR",
  IND: "IN",
  ITA: "IT",
  CAN: "CA",
  KOR: "KR",
  MEX: "MX",
  AUS: "AU",
  ESP: "ES",
  CHE: "CH",
  TUR: "TR",
  IDN: "ID",
  RUS: "RU",
};

async function getLatestFromHeatmap(
  supabase: any,
  country: string,
  seriesMap: Record<string, string>,
  yoySeries: Set<string>
): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {};

  for (const [seriesCode, field] of Object.entries(seriesMap)) {
    const { data } = await supabase
      .from("macro_heatmap_data")
      .select("raw_value, yoy_value, date")
      .eq("country", country)
      .eq("series_code", seriesCode)
      .order("date", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const row = data[0];
      result[field] = yoySeries.has(seriesCode)
        ? row.yoy_value
        : row.raw_value;
    }
  }

  return result;
}

async function fetchWorldBankIndicator(
  iso2: string,
  indicatorCode: string
): Promise<number | null> {
  try {
    const url = `https://api.worldbank.org/v2/country/${iso2}/indicator/${indicatorCode}?format=json&per_page=1&mrv=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json) || json.length < 2 || !json[1] || json[1].length === 0) {
      return null;
    }
    return json[1][0]?.value ?? null;
  } catch {
    return null;
  }
}

async function syncWorldBankCountry(
  countryCode: string,
  iso2: string
): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {};

  for (const [wbCode, field] of Object.entries(WB_INDICATORS)) {
    const value = await fetchWorldBankIndicator(iso2, wbCode);
    if (value !== null) {
      result[field] = parseFloat(value.toFixed(2));
    }
  }

  return result;
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

    const results: Array<{ country: string; status: string; fields?: string[] }> = [];

    // 1. Sync Brazil from macro_heatmap_data (BCB)
    try {
      const brData = await getLatestFromHeatmap(supabase, "BR", BR_SERIES, BR_YOY_SERIES);
      const brFields = Object.keys(brData).filter((k) => brData[k] !== null && brData[k] !== undefined);
      if (brFields.length > 0) {
        await supabase
          .from("macro_global_snapshot")
          .update({ ...brData, source: "bcb", updated_at: new Date().toISOString() })
          .eq("country_code", "BRA");
        results.push({ country: "BRA", status: "ok", fields: brFields });
      } else {
        results.push({ country: "BRA", status: "no_data" });
      }
    } catch (err) {
      results.push({ country: "BRA", status: `error: ${err}` });
    }

    // 2. Sync USA from macro_heatmap_data (FRED)
    try {
      const usData = await getLatestFromHeatmap(supabase, "US", US_SERIES, US_YOY_SERIES);
      const usFields = Object.keys(usData).filter((k) => usData[k] !== null && usData[k] !== undefined);
      if (usFields.length > 0) {
        await supabase
          .from("macro_global_snapshot")
          .update({ ...usData, source: "fred", updated_at: new Date().toISOString() })
          .eq("country_code", "USA");
        results.push({ country: "USA", status: "ok", fields: usFields });
      } else {
        results.push({ country: "USA", status: "no_data" });
      }
    } catch (err) {
      results.push({ country: "USA", status: `error: ${err}` });
    }

    // 3. Sync other countries from World Bank API
    for (const [countryCode, iso2] of Object.entries(WB_COUNTRIES)) {
      try {
        const wbData = await syncWorldBankCountry(countryCode, iso2);
        const wbFields = Object.keys(wbData).filter((k) => wbData[k] !== null && wbData[k] !== undefined);
        if (wbFields.length > 0) {
          await supabase
            .from("macro_global_snapshot")
            .update({ ...wbData, source: "worldbank", updated_at: new Date().toISOString() })
            .eq("country_code", countryCode);
          results.push({ country: countryCode, status: "ok", fields: wbFields });
        } else {
          results.push({ country: countryCode, status: "no_wb_data" });
        }
      } catch (err) {
        results.push({ country: countryCode, status: `error: ${err}` });
      }
    }

    return new Response(JSON.stringify({ synced: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("sync-macro-global error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
