import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Pause, Play, RefreshCw } from 'lucide-react';

interface TickerQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
}

function formatPrice(price: number) {
  if (!price) return '—';
  return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(val: number) {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

export function MarketTickerTape() {
  const [quotes, setQuotes] = useState<TickerQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const posRef = useRef(0);
  const pausedRef = useRef(false);


  const fetchQuotes = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('market-ticker');
      if (error) throw error;
      if (data?.quotes?.length) setQuotes(data.quotes);
    } catch (err) {
      console.error('Error fetching market data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 60_000);
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || quotes.length === 0) return;

    const speed = 0.5;
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
  }, [quotes.length]);

  if (loading && quotes.length === 0) {
    return (
      <div className="w-full rounded-t-lg h-10 flex items-center justify-center" style={{ background: 'hsl(var(--ticker-bg))' }}>
        <RefreshCw className="h-4 w-4 animate-spin" style={{ color: 'hsl(var(--ticker-fg) / 0.5)' }} />
      </div>
    );
  }

  if (quotes.length === 0) return null;

  const loopSequence = [...quotes, ...quotes];

  return (
    <div className="w-full rounded-t-lg overflow-hidden" style={{ background: 'hsl(var(--ticker-bg))' }}>
      <div className="flex items-center">
        <button
          onClick={() => setPaused((p) => !p)}
          className="flex-shrink-0 px-3 py-2.5 hover:opacity-80 transition-colors"
          style={{ borderRight: '1px solid hsl(var(--ticker-fg) / 0.1)' }}
          title={paused ? 'Reproduzir' : 'Pausar'}
        >
          {paused ? (
            <Play className="h-4 w-4" style={{ color: 'hsl(var(--ticker-fg))', fill: 'hsl(var(--ticker-fg))' }} />
          ) : (
            <Pause className="h-4 w-4" style={{ color: 'hsl(var(--ticker-fg))', fill: 'hsl(var(--ticker-fg))' }} />
          )}
        </button>

        <div
          ref={scrollRef}
          className="flex-1 overflow-hidden whitespace-nowrap"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="inline-flex items-center">
            {loopSequence.map((q, idx) => {
              const isPositive = q.changePercent > 0;
              const isNegative = q.changePercent < 0;

              return (
                <div
                  key={`quote-${q.symbol}-${idx}`}
                  className="inline-flex items-center gap-2 px-4 py-2"
                  style={{ borderRight: '1px solid hsl(var(--ticker-fg) / 0.1)' }}
                >
                  <span className="text-sm font-bold" style={{ color: 'hsl(var(--ticker-fg))' }}>
                    {q.name}
                  </span>
                  <span className="text-sm font-mono" style={{ color: 'hsl(var(--ticker-fg) / 0.8)' }}>
                    {formatPrice(q.price)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-bold font-mono ${
                      isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : ''
                    }`}
                    style={!isPositive && !isNegative ? { color: 'hsl(var(--ticker-fg) / 0.6)' } : undefined}
                  >
                    {isPositive && <TrendingUp className="h-3 w-3" />}
                    {isNegative && <TrendingDown className="h-3 w-3" />}
                    {formatChange(q.changePercent)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
