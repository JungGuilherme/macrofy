import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NewsTheme } from '@/lib/newsThemes';

export interface RssFeedItem {
  guid: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  creators: string[];
  imageUrl?: string;
  sourceName?: string; // injected at read-time from the feed's name
}

export interface RssFeed {
  id: string;
  name: string;
  items: RssFeedItem[];
  display_order: number;
  created_at: string;
  created_by: string | null;
  feed_url: string | null;
  /** legacy single theme — kept for back-compat */
  theme: string | null;
  /** new: multiple themes */
  themes: NewsTheme[];
  is_active: boolean;
}

/** Aggregated row used by the unified terminal list */
export interface AggregatedNewsRow {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: Date;
  themes: NewsTheme[];
  isFeatured: boolean;
  origin: 'rss' | 'manual';
  imageUrl?: string;
  summary?: string;
}

/** All themes (distinct, ordered) — legacy helper, used by Home/ticker */
export function useRssThemes() {
  const { data: feeds = [], ...rest } = useRssFeeds();
  const themes = Array.from(new Set(feeds.map((f) => f.theme).filter(Boolean) as string[]));
  themes.sort((a, b) => {
    const orderA = feeds.find((f) => f.theme === a)?.display_order ?? 999;
    const orderB = feeds.find((f) => f.theme === b)?.display_order ?? 999;
    return orderA - orderB;
  });
  return { themes, feeds, ...rest };
}

/** Get aggregated items for a (legacy) single theme — kept for Home/ticker compat */
export function getThemeItems(feeds: RssFeed[], theme: string): RssFeedItem[] {
  const themeFeeds = feeds.filter((f) => f.theme === theme);
  const allItems: RssFeedItem[] = [];
  for (const feed of themeFeeds) {
    for (const item of feed.items || []) {
      allItems.push({ ...item, sourceName: item.sourceName || feed.name });
    }
  }
  allItems.sort((a, b) => {
    const da = new Date(a.pubDate).getTime();
    const db = new Date(b.pubDate).getTime();
    if (isNaN(da) && isNaN(db)) return 0;
    if (isNaN(da)) return 1;
    if (isNaN(db)) return -1;
    return db - da;
  });
  return allItems;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export function useRssFeeds() {
  return useQuery({
    queryKey: ['rss-feeds'],
    queryFn: async () => {
      // Admins can SELECT directly and receive feed_url. Non-admins see no
      // rows from the table (RLS), so fall back to a SECURITY DEFINER RPC
      // that returns the public columns (without feed_url).
      const adminRes = await supabase
        .from('rss_feeds')
        .select('*')
        .order('display_order', { ascending: true });
      let rows: any[] = !adminRes.error && (adminRes.data?.length ?? 0) > 0
        ? (adminRes.data as any[])
        : [];
      if (rows.length === 0) {
        const { data } = await (supabase.rpc as any)('list_rss_feeds_public');
        rows = (data as any[]) ?? [];
      }
      return rows.map((d) => ({
        ...d,
        feed_url: d.feed_url ?? null,
        items: (d.items || []) as RssFeedItem[],
        themes: (d.themes || []) as NewsTheme[],
        is_active: d.is_active ?? true,
      })) as RssFeed[];
    },
    refetchInterval: ONE_HOUR_MS,
    staleTime: ONE_HOUR_MS / 2,
  });
}

export function useCreateRssFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (feed: {
      name: string; items: RssFeedItem[]; display_order: number;
      feed_url?: string; theme?: string; themes?: NewsTheme[]; is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('rss_feeds')
        .insert(feed as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rss-feeds'] }),
  });
}

export function useUpdateRssFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string; name?: string; items?: RssFeedItem[]; display_order?: number;
      feed_url?: string; theme?: string; themes?: NewsTheme[]; is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('rss_feeds')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rss-feeds'] }),
  });
}

export function useDeleteRssFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rss_feeds').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rss-feeds'] }),
  });
}

export async function parseRssXml(xml: string): Promise<RssFeedItem[]> {
  const { data, error } = await supabase.functions.invoke('parse-rss', {
    body: { xml },
  });
  if (error) throw error;
  return data.items as RssFeedItem[];
}

/** Build the unified consolidated list for the News page */
export function buildAggregatedNews(
  feeds: RssFeed[],
  manualNews: Array<{
    id: string; title: string; external_url: string; source: string | null;
    themes: NewsTheme[]; is_featured: boolean; published_at: string;
    image_url?: string | null; summary?: string | null; is_active: boolean;
  }> = [],
  filters: { theme?: NewsTheme | 'all'; onlyFeatured?: boolean; search?: string } = {}
): AggregatedNewsRow[] {
  const rows: AggregatedNewsRow[] = [];

  // RSS items
  for (const feed of feeds) {
    if (feed.is_active === false) continue;
    const feedThemes = feed.themes || [];
    for (const item of feed.items || []) {
      const d = new Date(item.pubDate);
      rows.push({
        id: `rss:${feed.id}:${item.guid}`,
        title: item.title,
        url: item.link,
        source: item.sourceName || feed.name,
        publishedAt: isNaN(d.getTime()) ? new Date(0) : d,
        themes: feedThemes,
        isFeatured: false,
        origin: 'rss',
        imageUrl: item.imageUrl,
        summary: item.description,
      });
    }
  }

  // Manual / curated items
  for (const n of manualNews) {
    if (!n.is_active) continue;
    const d = new Date(n.published_at);
    rows.push({
      id: `manual:${n.id}`,
      title: n.title,
      url: n.external_url,
      source: n.source || 'Editorial',
      publishedAt: isNaN(d.getTime()) ? new Date(0) : d,
      themes: n.themes || [],
      isFeatured: !!n.is_featured,
      origin: 'manual',
      imageUrl: n.image_url || undefined,
      summary: n.summary || undefined,
    });
  }

  // Filters
  let result = rows;
  if (filters.theme && filters.theme !== 'all') {
    result = result.filter((r) => r.themes.includes(filters.theme as NewsTheme));
  }
  if (filters.onlyFeatured) {
    result = result.filter((r) => r.isFeatured);
  }
  if (filters.search?.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      r.source.toLowerCase().includes(q) ||
      (r.summary || '').toLowerCase().includes(q)
    );
  }

  // Sort: featured first, then most recent
  result.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });

  return result;
}
