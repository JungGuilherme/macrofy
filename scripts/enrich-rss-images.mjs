// Backfills item images that refresh-rss drops: the edge function only
// parses media:content, but feeds like Investing ship <enclosure url>.
// For every active feed with a direct (non-Google-News) feed_url, fetch
// the XML here, map guid/link → image, and patch the stored items.
// Runs right after refresh-rss in the same workflow.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD

const { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing env vars');
  process.exit(1);
}

async function login() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Login failed: ${data.msg || res.status}`);
  return data.access_token;
}

function headers(token) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

/** guid/link → image url, from <enclosure> or <media:content>. */
function parseImages(xml) {
  const map = new Map();
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const block of items) {
    const guid = block.match(/<guid[^>]*>([^<]+)/)?.[1]?.trim();
    const link = block.match(/<link>([^<]+)/)?.[1]?.trim();
    const img =
      block.match(/<enclosure[^>]+url="([^"]+)"[^>]*type="image/)?.[1] ??
      block.match(/<enclosure[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)?.[1] ??
      block.match(/media:content[^>]*url="([^"]+)"/)?.[1];
    if (img) {
      if (guid) map.set(guid, img);
      if (link) map.set(link, img);
    }
  }
  return map;
}

const token = await login();

const feeds = await (
  await fetch(
    `${SUPABASE_URL}/rest/v1/rss_feeds?select=id,name,feed_url,items,is_active&is_active=eq.true`,
    { headers: headers(token) }
  )
).json();

for (const feed of feeds) {
  if (!feed.feed_url || feed.feed_url.includes('news.google.com')) continue;
  try {
    const res = await fetch(feed.feed_url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0' },
    });
    if (!res.ok) { console.log(`✗ ${feed.name}: feed HTTP ${res.status}`); continue; }
    const images = parseImages(await res.text());
    if (images.size === 0) { console.log(`— ${feed.name}: sem imagens no XML`); continue; }

    let patched = 0;
    const items = (feed.items ?? []).map((item) => {
      if (item.imageUrl) return item;
      const img = images.get(item.guid) ?? images.get(item.link);
      if (!img) return item;
      patched++;
      return { ...item, imageUrl: img };
    });

    if (patched === 0) { console.log(`— ${feed.name}: nada a completar`); continue; }
    const upd = await fetch(`${SUPABASE_URL}/rest/v1/rss_feeds?id=eq.${feed.id}`, {
      method: 'PATCH', headers: headers(token), body: JSON.stringify({ items }),
    });
    console.log(`${upd.ok ? '✓' : '✗'} ${feed.name}: ${patched} imagens adicionadas`);
  } catch (e) {
    console.log(`✗ ${feed.name}: ${e.message}`);
  }
}
console.log('Enriquecimento concluído.');
