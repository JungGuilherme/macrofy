import { useState, useEffect } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RssItemData {
  guid: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  creators: string[];
  imageUrl?: string;
  sourceName?: string;
}

interface RssNewsListProps {
  items: RssItemData[];
}

export function RssNewsList({ items }: RssNewsListProps) {
  const [translations, setTranslations] = useState<Record<string, { title: string; description: string }>>({});
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const untranslated = items.filter((item) => !translations[item.guid]);
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
            body: {
              items: batch.map((item) => ({
                title: item.title,
                description: item.description,
              })),
            },
          });
          if (error) throw error;
          if (cancelled) return;
          const newT: typeof translations = {};
          batch.forEach((item, idx) => {
            if (data.translations?.[idx]) {
              newT[item.guid] = data.translations[idx];
            }
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
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma notícia disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {translating && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Traduzindo notícias...</span>
        </div>
      )}
      {items.map((item) => {
        const t = translations[item.guid];
        const title = t?.title || item.title;
        const description = t?.description || item.description;

        return (
          <a
            key={item.guid}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-card border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start gap-4">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="w-20 h-14 object-cover rounded-md flex-shrink-0 hidden sm:block"
                  loading="lazy"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2 text-sm">
                  {title}
                </h3>
                {description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                  <span className="font-medium text-primary/70">{item.sourceName || 'RSS'}</span>
                  <span>•</span>
                  <span>{formatDate(item.pubDate)}</span>
                  {item.creators && item.creators.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="truncate">{item.creators.join(', ')}</span>
                    </>
                  )}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </a>
        );
      })}
    </div>
  );
}
