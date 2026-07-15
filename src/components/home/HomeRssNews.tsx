import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRssFeeds, type RssFeedItem } from '@/hooks/useRssFeeds';
import { ExternalLink, Newspaper, ArrowRight } from 'lucide-react';

/** Home widget: the freshest headlines across every active feed. */
export function HomeRssNews() {
  const { data: feeds = [], isLoading } = useRssFeeds();

  const items = useMemo(() => {
    const all: (RssFeedItem & { source: string })[] = [];
    for (const feed of feeds) {
      if (feed.is_active === false) continue;
      for (const item of feed.items ?? []) {
        all.push({ ...item, source: item.sourceName || feed.name });
      }
    }
    return all
      .filter((i) => !isNaN(new Date(i.pubDate).getTime()))
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 6);
  }, [feeds]);

  const timeLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours}h`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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
          <h2 className="section-title">Últimas Notícias</h2>
        </div>
        <Link to="/noticias" className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todas <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <a
            key={item.guid}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {item.title}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <span className="font-medium text-primary/70">{item.source}</span>
                <span>•</span>
                <span>{timeLabel(item.pubDate)}</span>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
    </div>
  );
}
