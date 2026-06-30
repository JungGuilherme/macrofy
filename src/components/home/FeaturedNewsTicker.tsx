import { useEffect, useMemo, useRef, useState } from 'react';
import { useCuratedNews } from '@/hooks/useCuratedNews';
import { Pause, Play } from 'lucide-react';

interface FeaturedItem {
  id: string;
  title: string;
  url: string;
  source: string;
}

export function FeaturedNewsTicker() {
  const { data: curated = [], isLoading } = useCuratedNews();
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const posRef = useRef(0);
  const pausedRef = useRef(false);

  const items = useMemo<FeaturedItem[]>(
    () =>
      curated
        .filter((n) => n.is_active && n.is_featured)
        .slice(0, 15)
        .map((n) => ({
          id: n.id,
          title: n.title,
          url: n.external_url,
          source: n.source || 'Editorial',
        })),
    [curated],
  );

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;

    const speed = 0.4;
    const animate = () => {
      if (!pausedRef.current) {
        posRef.current += speed;
        if (posRef.current >= el.scrollWidth / 2) posRef.current = 0;
        el.scrollLeft = posRef.current;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [items.length]);

  if (isLoading || items.length === 0) return null;

  const loopItems = [...items, ...items];

  return (
    <div className="w-full overflow-hidden rounded-b-lg" style={{ background: 'hsl(var(--ticker-news-bg))' }}>
      <div className="flex items-center">
        <div
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5"
          style={{ borderRight: '1px solid hsl(var(--ticker-news-fg) / 0.2)' }}
        >
          <span
            className="text-xs font-bold uppercase tracking-wider whitespace-nowrap"
            style={{ color: 'hsl(var(--ticker-news-fg))' }}
          >
            ÚLTIMAS
          </span>
          <button
            onClick={() => setPaused((p) => !p)}
            className="hover:opacity-80 rounded p-0.5 transition-colors"
            title={paused ? 'Reproduzir' : 'Pausar'}
          >
            {paused ? (
              <Play
                className="h-3 w-3"
                style={{ color: 'hsl(var(--ticker-news-fg))', fill: 'hsl(var(--ticker-news-fg))' }}
              />
            ) : (
              <Pause
                className="h-3 w-3"
                style={{ color: 'hsl(var(--ticker-news-fg))', fill: 'hsl(var(--ticker-news-fg))' }}
              />
            )}
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-hidden whitespace-nowrap" style={{ scrollbarWidth: 'none' }}>
          <div className="inline-flex items-center gap-0">
            {loopItems.map((item, idx) => (
              <a
                key={`${item.id}-${idx}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-1.5 hover:opacity-80 transition-colors"
              >
                <span
                  className="text-xs font-semibold hover:underline transition-colors"
                  style={{ color: 'hsl(var(--ticker-news-fg))' }}
                >
                  {item.title}
                </span>
                <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--ticker-news-fg) / 0.6)' }}>
                  {item.source}
                </span>
                <span className="text-xs" style={{ color: 'hsl(var(--ticker-news-fg) / 0.3)' }}>
                  |
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
