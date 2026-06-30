import { useState, useEffect } from 'react';
import { useRssFeeds, getThemeItems, RssFeedItem } from '@/hooks/useRssFeeds';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Newspaper, Loader2 } from 'lucide-react';

const MAIS_LIDAS_THEME = 'Mais Lidas';

export function HomeRssNews() {
  const { data: feeds = [], isLoading } = useRssFeeds();
  const [translations, setTranslations] = useState<Record<string, { title: string; description: string }>>({});
  const [translating, setTranslating] = useState(false);

  // Get items from "Mais Lidas" theme, fallback to first theme
  const items = (() => {
    const maisLidas = getThemeItems(feeds, MAIS_LIDAS_THEME);
    if (maisLidas.length > 0) return maisLidas.slice(0, 5);
    // Fallback: first theme with items
    const themes = Array.from(new Set(feeds.map((f) => f.theme || f.name).filter(Boolean)));
    for (const t of themes) {
      const items = getThemeItems(feeds, t);
      if (items.length > 0) return items.slice(0, 5);
    }
    return [];
  })();

  const feedLabel = (() => {
    const maisLidas = feeds.filter((f) => f.theme === MAIS_LIDAS_THEME);
    if (maisLidas.length > 0) return MAIS_LIDAS_THEME;
    return feeds[0]?.theme || feeds[0]?.name || 'Notícias';
  })();

  // Translate items
  useEffect(() => {
    if (items.length === 0) return;
    const untranslated = items.filter((item) => !translations[item.guid]);
    if (untranslated.length === 0) return;

    let cancelled = false;
    const translate = async () => {
      setTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke('translate-news', {
          body: {
            items: untranslated.map((item) => ({
              title: item.title,
              description: item.description,
            })),
          },
        });
        if (error) throw error;
        if (cancelled) return;
        const newT: typeof translations = {};
        untranslated.forEach((item, idx) => {
          if (data.translations?.[idx]) {
            newT[item.guid] = data.translations[idx];
          }
        });
        setTranslations((prev) => ({ ...prev, ...newT }));
      } catch (err) {
        console.error('Translation error:', err);
      } finally {
        if (!cancelled) setTranslating(false);
      }
    };
    translate();
    return () => { cancelled = true; };
  }, [items.map((i) => i.guid).join(',')]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Newspaper className="h-5 w-5 text-primary" />
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="section-title">{feedLabel}</h2>
          {translating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const t = translations[item.guid];
          const title = t?.title || item.title;

          return (
            <a
              key={item.guid}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {title}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-primary/70">{item.sourceName || feedLabel}</span>
                  <span>•</span>
                  <span>{formatDate(item.pubDate)}</span>
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
