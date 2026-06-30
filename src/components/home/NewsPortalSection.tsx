import { useState, useEffect } from 'react';
import { ExternalLink, Loader2, ChevronRight, Pencil, Trash2, Rss, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RssFeedItem, RssFeed } from '@/hooks/useRssFeeds';
import { Button } from '@/components/ui/button';

interface NewsPortalSectionProps {
  theme: string;
  items: RssFeedItem[];
  hero?: boolean;
  maxItems?: number;
  isAdmin?: boolean;
  feeds?: RssFeed[];
  onEditTheme?: (theme: string) => void;
  onDeleteTheme?: (theme: string) => void;
}

export function NewsPortalSection({
  theme, items, hero = false, maxItems = 6,
  isAdmin, feeds = [], onEditTheme, onDeleteTheme,
}: NewsPortalSectionProps) {
  const [translations, setTranslations] = useState<Record<string, { title: string; description: string }>>({});
  const [translating, setTranslating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const visibleItems = expanded ? items : items.slice(0, maxItems);
  const themeFeeds = feeds.filter((f) => f.theme === theme || (!f.theme && f.name === theme));

  useEffect(() => {
    if (items.length === 0) return;
    const displayItems = items.slice(0, Math.min(items.length, 20));
    const untranslated = displayItems.filter((item) => !translations[item.guid]);
    if (untranslated.length === 0) return;

    let cancelled = false;
    const translate = async () => {
      setTranslating(true);
      try {
        const batchSize = 10;
        for (let i = 0; i < untranslated.length; i += batchSize) {
          if (cancelled) return;
          const batch = untranslated.slice(i, i + batchSize);
          const { data, error } = await supabase.functions.invoke('translate-news', {
            body: { items: batch.map((item) => ({ title: item.title, description: item.description })) },
          });
          if (error) throw error;
          if (cancelled) return;
          const newT: typeof translations = {};
          batch.forEach((item, idx) => {
            if (data.translations?.[idx]) newT[item.guid] = data.translations[idx];
          });
          setTranslations((prev) => ({ ...prev, ...newT }));
        }
      } catch (err) {
        console.error('Translation error:', err);
      } finally {
        if (!cancelled) setTranslating(false);
      }
    };
    translate();
    return () => { cancelled = true; };
  }, [items]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const getTitle = (item: RssFeedItem) => translations[item.guid]?.title || item.title;

  if (items.length === 0 && !isAdmin) return null;

  const featured = items[0];
  const rest = visibleItems.slice(hero && featured ? 1 : 0);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Section header */}
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isAdmin && <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />}
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider truncate">{theme}</h2>
        </div>
        <div className="flex items-center gap-1">
          {translating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {/* Source count badge */}
          {themeFeeds.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
              {themeFeeds.length} fonte{themeFeeds.length !== 1 ? 's' : ''}
            </span>
          )}
          {isAdmin && onEditTheme && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); onEditTheme(theme); }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {isAdmin && onDeleteTheme && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive/70 hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDeleteTheme(theme); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Source chips (compact) */}
      {themeFeeds.length > 0 && (
        <div className="px-3 py-1 border-b border-border bg-muted/10 flex items-center gap-1 flex-wrap">
          {themeFeeds.map((feed) => (
            <span key={feed.id} className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Rss className="h-2.5 w-2.5" />
              <span>{feed.name}</span>
            </span>
          ))}
        </div>
      )}

      {/* Hero card */}
      {hero && featured && (
        <a
          href={featured.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-3 py-2 border-b border-border hover:bg-accent/30 transition-colors"
        >
          <h3 className="font-semibold text-foreground text-xs leading-snug line-clamp-2 mb-0.5">
            {getTitle(featured)}
          </h3>
          {(translations[featured.guid]?.description || featured.description) && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mb-0.5">
              {translations[featured.guid]?.description || featured.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="font-medium text-primary/80">{featured.sourceName || 'RSS'}</span>
            <span>•</span>
            <span>{formatDate(featured.pubDate)}</span>
          </div>
        </a>
      )}

      {/* News list */}
      {items.length === 0 && isAdmin ? (
        <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
          Nenhuma notícia neste quadro. Clique em editar para adicionar fontes RSS.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {rest.map((item) => (
            <a
              key={item.guid}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 px-3 py-1.5 hover:bg-accent/30 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                  {getTitle(item)}
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                  <span className="font-medium text-primary/70">{item.sourceName || 'RSS'}</span>
                  <span>•</span>
                  <span>{formatDate(item.pubDate)}</span>
                </div>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
            </a>
          ))}
        </div>
      )}

      {/* Show more */}
      {items.length > maxItems && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-2 text-[11px] font-medium text-primary hover:bg-accent/30 transition-colors flex items-center justify-center gap-1 border-t border-border"
        >
          {expanded ? 'Ver menos' : `+${items.length - maxItems} notícias`}
          <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      )}
    </div>
  );
}
