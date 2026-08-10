// Edge function: sync-earnings-us
// Scrapes Zacks' internal earnings-calendar data endpoint directly (not the
// page itself, which is a JS shell) — verified it returns the full table via
// plain fetch, no browser session/cookies needed. The endpoint takes one
// day at a time (`date` = that day's midnight ET, as a Unix timestamp), so
// this loops over the next DAYS_AHEAD calendar days.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://www.zacks.com/data_handler/earnings_calendar/calendar_handlers.php";
const DAYS_AHEAD = 10;

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .trim();
}

// Zacks' `date` param = midnight ET (always UTC-5, not DST-adjusted) for the
// target day, as a Unix timestamp — e.g. Aug 10 2026 → 2026-08-10T05:00:00Z.
function etMidnightTimestamp(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 5, 0, 0) / 1000);
}

interface EarningsRow {
  ticker: string;
  company_name: string;
  time_of_day: string | null;
}

function parseZacksDay(html: string): EarningsRow[] {
  const rows: EarningsRow[] = [];
  const trRe = /<tr>\s*<th class="text-start q-ticker"[\s\S]*?rel="([A-Z.]+)"[\s\S]*?<\/th>\s*<td class="text-start"><span title="([^"]*)"[^>]*>[\s\S]*?<\/span><\/td>\s*<td class="text-end">([^<]*)<\/td>\s*<td class="text-end">([^<]*)<\/td>/g;
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(html)) !== null) {
    const [, ticker, company, , time] = m;
    const t = time.trim();
    rows.push({
      ticker,
      company_name: decodeEntities(company),
      time_of_day: t === "bmo" || t === "amc" ? t : null,
    });
  }
  return rows;
}

async function fetchDay(date: Date): Promise<EarningsRow[]> {
  const ts = etMidnightTimestamp(date);
  const url = `${BASE_URL}?calltype=eventscal&date=${ts}&type=1&search_trigger=0`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125",
      "Referer": "https://www.zacks.com/earnings/earnings-calendar",
    },
  });
  if (!res.ok) return [];
  const html = await res.text();
  return parseZacksDay(html);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const today = new Date();
    const results: { date: string; rows: number }[] = [];
    let totalUpserted = 0;

    for (let i = 0; i < DAYS_AHEAD; i++) {
      const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
      const dateIso = day.toISOString().slice(0, 10);
      const rows = await fetchDay(day);

      if (rows.length > 0) {
        const records = rows.map((r) => ({
          event_type: "earnings",
          country: "US",
          ticker: r.ticker,
          company_name: r.company_name,
          event_date: dateIso,
          time_of_day: r.time_of_day,
          source: "zacks",
          updated_at: new Date().toISOString(),
        }));

        for (let b = 0; b < records.length; b += 200) {
          const batch = records.slice(b, b + 200);
          const { error } = await supabase
            .from("calendar_events")
            .upsert(batch, { onConflict: "event_type,country,ticker,event_date" });
          if (error) console.error(`Upsert error ${dateIso}:`, error.message);
        }
        totalUpserted += records.length;
      }
      results.push({ date: dateIso, rows: rows.length });
    }

    return new Response(JSON.stringify({ success: true, total: totalUpserted, days: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("sync-earnings-us error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
