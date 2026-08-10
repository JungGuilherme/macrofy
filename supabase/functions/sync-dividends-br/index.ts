// Edge function: sync-dividends-br
// Scrapes investidor10's "Agenda de Dividendos" page — server-rendered HTML
// table, no JS/session needed (verified: plain fetch returns the full table,
// no Cloudflare challenge like StatusInvest's own dividends page has).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOURCE_URL = "https://investidor10.com.br/acoes/dividendos/";

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .trim();
}

function parseBrShortDate(s: string): string | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!m) return null;
  return `20${m[3]}-${m[2]}-${m[1]}`;
}

interface DividendRow {
  ticker: string;
  company_name: string | null;
  event_date: string;
  payment_date: string | null;
  dividend_type: string;
  value: number | null;
}

function parseInvestidor10(html: string): DividendRow[] {
  const rows: DividendRow[] = [];
  const trRe = /<tr class="hover:bg-gray-50" ticker-name="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(html)) !== null) {
    const [, ticker, body] = m;
    const companyMatch = body.match(/class="company-name hide-company-name">([^<]+)</);
    const spans = [...body.matchAll(/<span class="(?:table-field mobile-font|payment-price mobile-font)">\s*([^<]+?)\s*<\/span>/g)]
      .map((s) => s[1].trim());
    if (spans.length < 4) continue;

    const eventDate = parseBrShortDate(spans[0]);
    const paymentDate = parseBrShortDate(spans[1]);
    if (!eventDate) continue;

    const value = parseFloat(spans[3].replace("R$", "").replace(",", ".").trim());

    rows.push({
      ticker,
      company_name: companyMatch ? decodeEntities(companyMatch[1]) : null,
      event_date: eventDate,
      payment_date: paymentDate,
      dividend_type: spans[2],
      value: Number.isFinite(value) ? value : null,
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
    if (!res.ok) throw new Error(`investidor10 fetch failed: ${res.status}`);
    const html = await res.text();

    const rows = parseInvestidor10(html);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma linha extraída — layout pode ter mudado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const records = rows.map((r) => ({
      event_type: "dividend",
      country: "BR",
      ticker: r.ticker,
      company_name: r.company_name,
      event_date: r.event_date,
      payment_date: r.payment_date,
      dividend_type: r.dividend_type,
      value: r.value,
      source: "investidor10",
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
    console.error("sync-dividends-br error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
