import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIVATE_HOST_RE = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|fe80:|fc00:|fd00:)/i;
function isPrivateUrl(u: string): boolean {
  try {
    const url = new URL(u);
    if (!/^https?:$/.test(url.protocol)) return true;
    const host = url.hostname.toLowerCase();
    if (PRIVATE_HOST_RE.test(host)) return true;
    // 172.16.0.0 - 172.31.255.255
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
  // Handle CDATA sections
  const cdataPattern = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
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

    // Extract media:content url
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

  // Require authenticated caller (prevents SSRF abuse)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (authErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    let xml: string | undefined = body.xml;

    // If a URL was provided instead of raw XML, fetch it
    if (!xml && body.url && typeof body.url === "string") {
      if (isPrivateUrl(body.url)) {
        return new Response(JSON.stringify({ error: "URL not allowed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = await fetch(body.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MacrofyBot/1.0)" },
      });
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch RSS from URL: ${res.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      xml = await res.text();
    }

    if (!xml || typeof xml !== "string") {
      return new Response(
        JSON.stringify({ error: "xml string or url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const items = parseItems(xml);

    return new Response(JSON.stringify({ items, count: items.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-rss error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Failed to parse RSS" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
