const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FedWatchScenario {
  range: string;
  probability: number;
}

// Updated fallback based on CME FedWatch as of 2026-03-24
const FALLBACK_DATA: FedWatchScenario[] = [
  { range: '3.50–3.75', probability: 99.9 },
  { range: '3.75–4.00', probability: 0.1 },
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
    // Try CME FedWatch scraping
    const liveResult = await fetchFromCME();

    if (liveResult && liveResult.length > 0) {
      const top3 = liveResult
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3);

      console.log('[FedWatch-Proxy] Live data:', JSON.stringify(top3));

      // Clear old cache then save new
      await clearCache();
      saveToDB(top3).catch((e) => console.error('Cache save error:', e));

      return jsonResponse({
        success: true,
        data: top3,
        updatedAt: new Date().toISOString(),
        source: 'cme-live',
      });
    }

    // Try DB cache
    console.log('[FedWatch-Proxy] No live data, trying DB cache');
    const dbFallback = await getFallbackFromDB();
    if (dbFallback.data.length > 0) {
      return jsonResponse({ success: true, ...dbFallback });
    }

    // Use hardcoded fallback
    console.log('[FedWatch-Proxy] Using hardcoded fallback');
    await clearCache();
    saveToDB(FALLBACK_DATA).catch((e) => console.error('Fallback save error:', e));

    return jsonResponse({
      success: true,
      data: FALLBACK_DATA,
      updatedAt: FALLBACK_DATE,
      source: 'fallback-hardcoded',
    });
  } catch (error) {
    console.error('[FedWatch-Proxy] Error:', error);

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

async function fetchFromCME(): Promise<FedWatchScenario[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    // CME FedWatch API - get next meeting probabilities
    const res = await fetch(
      'https://www.cmegroup.com/CmeWS/mvc/FedWatch/FedWatchOdds',
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html',
          'Origin': 'https://www.cmegroup.com',
        },
      }
    );
    clearTimeout(timer);

    if (!res.ok) {
      console.log(`[FedWatch-Proxy] CME API returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    console.log('[FedWatch-Proxy] CME response type:', typeof data, Array.isArray(data));

    // CME FedWatch returns an array of meetings, each with probability distributions
    if (Array.isArray(data) && data.length > 0) {
      const nextMeeting = data[0]; // First meeting is the next one
      console.log('[FedWatch-Proxy] Next meeting keys:', Object.keys(nextMeeting));

      // Parse probabilities from the response
      const scenarios: FedWatchScenario[] = [];

      // CME format has properties like "0-25", "25-50", etc. with probability values
      for (const [key, value] of Object.entries(nextMeeting)) {
        if (typeof value === 'number' && key.includes('-')) {
          const parts = key.split('-');
          if (parts.length === 2) {
            const low = parseInt(parts[0]) / 100;
            const high = parseInt(parts[1]) / 100;
            const range = `${low.toFixed(2)}–${high.toFixed(2)}`;
            if (value > 0) {
              scenarios.push({ range, probability: parseFloat(value.toFixed(1)) });
            }
          }
        }
      }

      if (scenarios.length > 0) {
        return scenarios;
      }
    }

    // Try alternative JSON structure
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const meetings = data.meetings || data.data || data.odds;
      if (Array.isArray(meetings) && meetings.length > 0) {
        const meeting = meetings[0];
        const probs = meeting.probabilities || meeting.odds || [];

        if (Array.isArray(probs)) {
          const scenarios: FedWatchScenario[] = [];
          for (const p of probs) {
            const range = p.range || p.rate_range || p.label || '';
            const prob = p.probability || p.value || p.prob || 0;
            if (range && prob > 0) {
              scenarios.push({ range, probability: parseFloat(Number(prob).toFixed(1)) });
            }
          }
          if (scenarios.length > 0) return scenarios;
        }
      }
    }

    console.log('[FedWatch-Proxy] Could not parse CME response');
    return null;
  } catch (e) {
    clearTimeout(timer);
    console.error('[FedWatch-Proxy] CME fetch failed:', (e as Error).message);
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
  await fetch(`${url}/rest/v1/fedwatch_cache?id=not.is.null`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
}

async function saveToDB(scenarios: FedWatchScenario[]) {
  const { url, key } = getSupabaseConfig();

  const rows = scenarios.map((s) => ({
    rate_range: s.range,
    probability: s.probability,
    updated_at: new Date().toISOString(),
  }));

  await fetch(`${url}/rest/v1/fedwatch_cache`, {
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

async function getFallbackFromDB(): Promise<{ data: FedWatchScenario[]; updatedAt: string; source: string }> {
  const { url, key } = getSupabaseConfig();

  try {
    const res = await fetch(
      `${url}/rest/v1/fedwatch_cache?select=*&order=probability.desc&limit=3`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );

    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0) {
        return {
          data: rows.map((r: any) => ({ range: r.rate_range, probability: Number(r.probability) })),
          updatedAt: rows[0].updated_at,
          source: 'cache',
        };
      }
    }
  } catch (e) {
    console.error('[FedWatch-Proxy] DB fallback error:', e);
  }

  return { data: [], updatedAt: new Date().toISOString(), source: 'empty' };
}
