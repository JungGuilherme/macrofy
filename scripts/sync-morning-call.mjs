// Pulls the latest "Morning Call" video from the Alta Vista Investimentos
// YouTube channel RSS feed and upserts it into morning_calls via PostgREST.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD

const { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing env vars');
  process.exit(1);
}

const CHANNEL_ID = 'UCLQtYJ04ZOouS1B5i-mfW6w'; // @altavistainvestimentos
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

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
  };
}

/** Extract <entry> blocks from the Atom feed with videoId, title, published. */
function parseEntries(xml) {
  const entries = [];
  const re = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const videoId = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = block.match(/<title>([^<]+)<\/title>/)?.[1]?.trim();
    const published = block.match(/<published>([^<]+)<\/published>/)?.[1];
    if (videoId && title && published) entries.push({ videoId, title, published });
  }
  return entries;
}

/** Date (YYYY-MM-DD) in America/Sao_Paulo for a given ISO timestamp. */
function spDate(iso) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso));
}

const feedRes = await fetch(FEED_URL, { headers: { 'User-Agent': 'macrofy-sync/1.0' } });
if (!feedRes.ok) {
  console.error(`Feed fetch failed: HTTP ${feedRes.status}`);
  process.exit(1);
}
const xml = await feedRes.text();
const entries = parseEntries(xml);

// The channel posts other content too — only take actual Morning Calls.
const mc = entries.find((e) => /morning\s*call/i.test(e.title));
if (!mc) {
  console.log('No Morning Call entry found in the feed — nothing to do.');
  process.exit(0);
}

const videoUrl = `https://www.youtube.com/watch?v=${mc.videoId}`;
const publishedDate = spDate(mc.published);
console.log(`Latest: "${mc.title}" → ${videoUrl} (${publishedDate})`);

const token = await login();

// Upsert by published_date (no unique constraint on the column)
const q = `${SUPABASE_URL}/rest/v1/morning_calls?published_date=eq.${publishedDate}&select=id,video_url`;
const existing = await (await fetch(q, { headers: headers(token) })).json();

const payload = {
  title: mc.title,
  video_url: videoUrl,
  published_date: publishedDate,
  is_published: true,
};

if (Array.isArray(existing) && existing.length > 0) {
  if (existing[0].video_url === videoUrl) {
    console.log('Already up to date.');
    process.exit(0);
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/morning_calls?id=eq.${existing[0].id}`,
    { method: 'PATCH', headers: { ...headers(token), Prefer: 'return=minimal' }, body: JSON.stringify(payload) }
  );
  console.log(res.ok ? 'Updated existing row.' : `Update failed: HTTP ${res.status}`);
  process.exit(res.ok ? 0 : 1);
} else {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/morning_calls`,
    { method: 'POST', headers: { ...headers(token), Prefer: 'return=minimal' }, body: JSON.stringify(payload) }
  );
  console.log(res.ok ? 'Inserted new row.' : `Insert failed: HTTP ${res.status} ${await res.text()}`);
  process.exit(res.ok ? 0 : 1);
}
