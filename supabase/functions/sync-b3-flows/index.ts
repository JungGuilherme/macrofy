import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOURCE_URL = "https://www.dadosdemercado.com.br/fluxo";

// ─── Parse BR monetary value like "-1.034,86 mi" → -1034.86 ──
function parseBrValue(raw: string): number {
  if (!raw || raw.trim() === "" || raw.trim() === "-") return 0;
  const s = raw.trim().replace(/\s*mi$/i, "").trim();
  // BR format: "1.034,86" → remove dots, replace comma with dot
  const normalized = s.replace(/\./g, "").replace(",", ".");
  return parseFloat(normalized) || 0;
}

// ─── Parse date "26/03/2026" → "2026-03-26" ──────────────────
function parseBrDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// ─── Parse HTML table rows ────────────────────────────────────
interface FlowRow {
  trade_date: string;
  foreign_flow: number;
  institutional: number;
  individual: number;
  financial_institutions: number;
  others: number;
}

function parseHtmlTable(html: string): FlowRow[] {
  const rows: FlowRow[] = [];

  // Match each <tr> containing <td> cells
  const trRegex = /<tr>\s*<td>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/gs;

  let match;
  while ((match = trRegex.exec(html)) !== null) {
    const dateStr = parseBrDate(match[1]);
    if (!dateStr) continue;

    rows.push({
      trade_date: dateStr,
      foreign_flow: parseBrValue(match[2]),
      institutional: parseBrValue(match[3]),
      individual: parseBrValue(match[4]),
      financial_institutions: parseBrValue(match[5]),
      others: parseBrValue(match[6]),
    });
  }

  return rows;
}

// ─── Background processing ───────────────────────────────────
async function processSync() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Get last date already in DB
    const { data: lastRow } = await supabase
      .from("b3_flow_daily")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .single();

    const lastDate = lastRow?.date || null;
    console.log(`Last date in DB: ${lastDate || "none (empty table)"}`);

    // 2. Download HTML page
    console.log(`Fetching HTML from: ${SOURCE_URL}`);
    const res = await fetch(SOURCE_URL, {
      signal: AbortSignal.timeout(30000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MacroFyPro/1.0)",
        "Accept": "text/html",
      },
    });
    if (!res.ok) throw new Error(`Page download failed: ${res.status}`);

    const html = await res.text();
    console.log(`HTML downloaded: ${html.length} chars`);

    // 3. Parse table
    const allRows = parseHtmlTable(html);
    console.log(`Parsed ${allRows.length} rows from HTML table`);

    if (allRows.length === 0) {
      console.warn("No rows parsed — page structure may have changed");
      return { inserted: 0, total: 0 };
    }

    // 4. Filter only new records
    const newRows = lastDate
      ? allRows.filter((r) => r.trade_date > lastDate)
      : allRows;

    console.log(`New records to upsert: ${newRows.length} (of ${allRows.length} total)`);

    if (newRows.length === 0) {
      console.log("Already up to date");
      return { inserted: 0, total: allRows.length };
    }

    // 5. Batch upsert
    const now = new Date().toISOString();
    const records = newRows.map((r) => ({
      date: r.trade_date,
      foreign_flow: r.foreign_flow,
      institutional: r.institutional,
      individual: r.individual,
      financial_institutions: r.financial_institutions,
      others: r.others,
      source: "dadosdemercado",
      updated_at: now,
    }));

    const { error } = await supabase
      .from("b3_flow_daily")
      .upsert(records, { onConflict: "date" });

    if (error) {
      console.error("Upsert error:", error.message);
      return { inserted: 0, error: error.message };
    }

    console.log(`Sync complete: ${records.length} records upserted`);
    return { inserted: records.length, total: allRows.length };
  } catch (err: any) {
    console.error("sync-b3-flows error:", err.message);
    return { inserted: 0, error: err.message };
  }
}

// ─── Main handler ────────────────────────────────────────────
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


  try {
    // Fire-and-forget background processing
    EdgeRuntime.waitUntil(processSync());

    return new Response(
      JSON.stringify({ status: "processing", message: "Sincronização iniciada em background" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("sync-b3-flows handler error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
