const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CopomScenario {
  scenario: string;
  probability: number;
}

// Hardcoded fallback based on real B3 data from 17/03/2026
const FALLBACK_DATA: CopomScenario[] = [
  { scenario: 'Queda de 0,25%', probability: 53 },
  { scenario: 'Manutenção', probability: 25 },
  { scenario: 'Queda de 0,50%', probability: 24 },
];
const FALLBACK_DATE = '2026-03-17T18:00:00Z';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    const scenarios = await fetchCopomFromBrapi();

    if (scenarios && scenarios.length > 0) {
      const top3 = scenarios
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3);

      console.log('[Copom-Proxy] ALL scenarios:', JSON.stringify(scenarios));
      console.log('[Copom-Proxy] Top 3:', JSON.stringify(top3));

      // Clear old cache then save new
      await clearCache();
      saveToDB(top3).catch((e) => console.error('Cache save error:', e));

      return jsonResponse({
        success: true,
        data: top3,
        updatedAt: new Date().toISOString(),
        source: 'brapi-live',
      });
    }

    // Try DB cache
    console.log('[Copom-Proxy] No live data, trying DB cache');
    const dbFallback = await getFallbackFromDB();
    if (dbFallback.data.length > 0) {
      return jsonResponse({ success: true, ...dbFallback });
    }

    // Use hardcoded fallback
    console.log('[Copom-Proxy] Using hardcoded fallback');
    await clearCache();
    saveToDB(FALLBACK_DATA).catch((e) => console.error('Fallback save error:', e));

    return jsonResponse({
      success: true,
      data: FALLBACK_DATA,
      updatedAt: FALLBACK_DATE,
      source: 'fallback-hardcoded',
    });
  } catch (error) {
    console.error('[Copom-Proxy] Error:', error);

    try {
      const dbFallback = await getFallbackFromDB();
      if (dbFallback.data.length > 0) {
        return jsonResponse({ success: true, ...dbFallback });
      }
    } catch {}

    return jsonResponse({
      success: true,
      data: FALLBACK_DATA,
      updatedAt: FALLBACK_DATE,
      source: 'fallback-hardcoded',
    });
  }
});

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

async function fetchCopomFromBrapi(): Promise<CopomScenario[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    // CPMK26 tickers for May 2026 Copom meeting
    const tickers = [
      'CPMK26C099500', // Queda de 0,50%
      'CPMK26C099750', // Queda de 0,25%
      'CPMK26C100000', // Manutenção
      'CPMK26C100250', // Aumento de 0,25%
      'CPMK26C100500', // Aumento de 0,50%
    ];

    const tickerStr = tickers.join(',');
    const brapiToken = Deno.env.get('BRAPI_TOKEN') || '';
    const url = `https://brapi.dev/api/quote/${tickerStr}?token=${brapiToken}`;

    console.log(`[Copom-Proxy] Trying CPMK26 tickers...`);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.log(`[Copom-Proxy] brapi returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const results = data?.results;

    if (!Array.isArray(results) || results.length === 0) return null;

    const scenarios: CopomScenario[] = [];

    for (const item of results) {
      const symbol = item.symbol || '';
      const price = item.regularMarketPrice ?? item.previousClose ?? null;

      if (price === null || price <= 0) continue;

      // Extract strike from ticker: CPMK26C099750 → 099750 → 99750
      const strikeMatch = symbol.match(/C(\d+)$/);
      if (!strikeMatch) continue;

      const strike = parseInt(strikeMatch[1], 10);
      const diff = strike - 100000;

      let scenario: string;
      if (diff === 0) {
        scenario = 'Manutenção';
      } else {
        const pctChange = Math.abs(diff) / 1000;
        const pctFormatted = pctChange.toFixed(2).replace('.', ',');
        scenario = diff > 0
          ? `Aumento de ${pctFormatted}%`
          : `Queda de ${pctFormatted}%`;
      }

      // Option price IS the probability
      const probability = parseFloat(price.toFixed(1));

      console.log(`[Copom-Proxy] ${symbol}: strike=${strike}, scenario="${scenario}", prob=${probability}`);

      if (probability > 0) {
        scenarios.push({ scenario, probability });
      }
    }

    return scenarios.length > 0 ? scenarios : null;
  } catch (e) {
    clearTimeout(timer);
    console.error('[Copom-Proxy] Fetch failed:', (e as Error).message);
    return null;
  }
}

function getSupabaseConfig() {
  return {
    url: Deno.env.get('SUPABASE_URL')!,
    key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  };
}

async function clearCache() {
  const { url, key } = getSupabaseConfig();
  await fetch(`${url}/rest/v1/copom_cache?id=not.is.null`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
}

async function saveToDB(scenarios: CopomScenario[]) {
  const { url, key } = getSupabaseConfig();

  const rows = scenarios.map((s) => ({
    scenario: s.scenario,
    probability: s.probability,
    updated_at: new Date().toISOString(),
  }));

  await fetch(`${url}/rest/v1/copom_cache`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
}

async function getFallbackFromDB(): Promise<{ data: CopomScenario[]; updatedAt: string; source: string }> {
  const { url, key } = getSupabaseConfig();

  try {
    const res = await fetch(
      `${url}/rest/v1/copom_cache?select=*&order=probability.desc&limit=3`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );

    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0) {
        return {
          data: rows.map((r: any) => ({ scenario: r.scenario, probability: Number(r.probability) })),
          updatedAt: rows[0].updated_at,
          source: 'cache',
        };
      }
    }
  } catch (e) {
    console.error('[Copom-Proxy] DB fallback error:', e);
  }

  return { data: [], updatedAt: new Date().toISOString(), source: 'empty' };
}
