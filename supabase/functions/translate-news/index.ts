import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ITEMS = 30;
const MAX_FIELD = 2000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Require authenticated caller
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
    const { items } = await req.json();
    // items: Array<{ title: string; description: string }>

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "items array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (items.length > MAX_ITEMS) {
      return new Response(JSON.stringify({ error: `Too many items (max ${MAX_ITEMS})` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const it of items) {
      if (typeof it?.title !== "string" || typeof it?.description !== "string" ||
          it.title.length > MAX_FIELD || it.description.length > MAX_FIELD) {
        return new Response(JSON.stringify({ error: "Invalid item shape or field too long" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const itemsText = items
      .map((item: any, i: number) => `[${i}] TITLE: ${item.title}\nDESC: ${item.description}`)
      .join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate news headlines and descriptions from English to Brazilian Portuguese. Keep the journalistic tone. Return ONLY a JSON array where each element has "title" and "description" fields, in the same order as input. No markdown, no explanation, just the JSON array.`,
          },
          {
            role: "user",
            content: itemsText,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Translation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from content (strip markdown fences if present)
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    // Remove control characters that break JSON.parse (tabs, newlines inside strings, etc.)
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (ch: string) => {
      if (ch === '\n' || ch === '\r' || ch === '\t') return ' ';
      return '';
    });

    let translations: any[];
    try {
      translations = JSON.parse(cleaned);
    } catch {
      // Fallback: return originals untranslated
      console.error("Failed to parse AI response, returning originals");
      const { items } = await req.clone().json().catch(() => ({ items: [] }));
      translations = items;
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
