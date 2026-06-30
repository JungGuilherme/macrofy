import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SSRF guard: block private/loopback/link-local/metadata hosts and non-http(s) schemes.
const PRIVATE_HOST_RE = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|fe80:|fc00:|fd00:)/i;
function isPrivateUrl(u: string): boolean {
  try {
    const url = new URL(u);
    if (!/^https?:$/.test(url.protocol)) return true;
    const host = url.hostname.toLowerCase();
    if (PRIVATE_HOST_RE.test(host)) return true;
    const m = host.match(/^172\.(\d+)\./);
    if (m && +m[1] >= 16 && +m[1] <= 31) return true;
    return false;
  } catch {
    return true;
  }
}

interface ParsedItem {
  guid: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  creators: string[];
  imageUrl?: string;
}

function extractText(xml: string, tag: string): string {
  const cdataPattern = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  );
  const cdataMatch = xml.match(cdataPattern);
  if (cdataMatch) return cdataMatch[1].trim();

  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(pattern);
  return match ? match[1].trim() : "";
}

function extractAll(xml: string, tag: string): string[] {
  const results: string[] = [];
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

function parseItems(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemPattern.exec(xml)) !== null) {
    const itemXml = match[1];
    const guid =
      extractText(itemXml, "guid") ||
      extractText(itemXml, "link") ||
      crypto.randomUUID();
    const title = extractText(itemXml, "title");
    const description = extractText(itemXml, "description");
    const link = extractText(itemXml, "link");
    const pubDate = extractText(itemXml, "pubDate");
    const creators = extractAll(itemXml, "dc:creator");
    const mediaMatch = itemXml.match(/media:content[^>]*url="([^"]+)"/i);
    const imageUrl = mediaMatch ? mediaMatch[1] : undefined;

    if (title) {
      items.push({ guid, title, description, link, pubDate, creators, imageUrl });
    }
  }
  return items;
}

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active feeds that have a feed_url
    const { data: feeds, error: fetchError } = await supabase
      .from("rss_feeds")
      .select("id, name, feed_url, is_active")
      .not("feed_url", "is", null)
      .neq("is_active", false);

    if (fetchError) throw fetchError;

    const results: { id: string; name: string; itemCount: number; error?: string }[] = [];

    for (const feed of feeds || []) {
      if (!feed.feed_url) continue;
      if (isPrivateUrl(feed.feed_url)) {
        results.push({ id: feed.id, name: feed.name, itemCount: 0, error: "URL not allowed" });
        continue;
      }

      try {
        const response = await fetch(feed.feed_url);
        if (!response.ok) {
          results.push({ id: feed.id, name: feed.name, itemCount: 0, error: `HTTP ${response.status}` });
          continue;
        }
        const xml = await response.text();
        const items = parseItems(xml);

        const { error: updateError } = await supabase
          .from("rss_feeds")
          .update({ items })
          .eq("id", feed.id);

        if (updateError) {
          results.push({ id: feed.id, name: feed.name, itemCount: 0, error: updateError.message });
        } else {
          results.push({ id: feed.id, name: feed.name, itemCount: items.length });
        }
      } catch (e) {
        results.push({
          id: feed.id,
          name: feed.name,
          itemCount: 0,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    console.log("RSS refresh completed:", JSON.stringify(results));

    return new Response(JSON.stringify({ refreshed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refresh-rss error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Failed to refresh RSS" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
