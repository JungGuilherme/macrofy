// Edge function: sync-earnings-br
// Scrapes StatusInvest's "Agenda de Resultados" page — server-rendered HTML
// table, no JS/session needed (verified: plain fetch returns the full table).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOURCE_URL = "https://statusinvest.com.br/acoes/agenda-de-resultados";

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .trim();
}

interface EarningsRow {
  ticker: string;
  company_name: string;
  event_date: string;
  time_of_day: string | null;
}

function parseStatusInvest(html: string): EarningsRow[] {
  const rows: EarningsRow[] = [];
  const trRe = /<tr class="line"\s+data-code="([^"]+)"\s+data-name="([^"]+)"\s+data-hasresultdate="true">([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(html)) !== null) {
    const [, code, name, body] = m;
    const tds = [...body.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((t) => decodeEntities(t[1].replace(/<[^>]+>/g, "")));
    const dateStr = tds[1];
    const dm = dateStr?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!dm) continue;
    const time = tds[2];
    rows.push({
      ticker: code,
      company_name: decodeEntities(name),
      event_date: `${dm[3]}-${dm[2]}-${dm[1]}`,
      time_of_day: time && !/n[aã]o informado/i.test(time) ? time : null,
    });
  }
  return rows;
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
    const res = await fetch(SOURCE_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125" },
    });
    if (!res.ok) throw new Error(`StatusInvest fetch failed: ${res.status}`);
    const html = await res.text();

    const rows = parseStatusInvest(html);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma linha extraída — layout pode ter mudado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const records = rows.map((r) => ({
      event_type: "earnings",
      country: "BR",
      ticker: r.ticker,
      company_name: r.company_name,
      event_date: r.event_date,
      time_of_day: r.time_of_day,
      source: "statusinvest",
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("calendar_events")
      .upsert(records, { onConflict: "event_type,country,ticker,event_date" });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, rows: records.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("sync-earnings-br error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
