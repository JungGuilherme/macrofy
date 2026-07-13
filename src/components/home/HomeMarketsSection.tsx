import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
}

/* CNBC-style category strip fed by the existing edge functions:
   market-ticker covers everything except Europe/Asia indices, which come
   from market-sparklines' global_indices preset (lazy, on first open). */

const CATEGORIES = [
  { key: 'brasil', label: 'Brasil', symbols: ['^BVSP', 'IFIX', 'USDBRL'] },
  { key: 'eua', label: 'EUA', symbols: ['^GSPC', '^IXIC', '^DJI'] },
  { key: 'global', label: 'Global', symbols: ['^GDAXI', '^FTSE', '^N225'] },
  { key: 'cripto', label: 'Cripto', symbols: ['BTC-USD', 'ETH-USD'] },
  { key: 'commodities', label: 'Commodities', symbols: ['GC=F', 'BZ=F'] },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

function fmt(price: number, currency?: string): string {
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US';
  const digits = price >= 1000 ? 2 : price >= 10 ? 2 : 4;
  return price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: digits });
}

function QuoteCard({ q, updatedAt }: { q: Quote; updatedAt: Date | null }) {
  const up = q.changePercent >= 0;
  return (
    <div
      className={cn(
        'rounded-lg px-4 py-3 min-w-[190px] flex-1 text-white shadow-sm',
        up ? 'bg-emerald-700' : 'bg-red-700'
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-bold uppercase tracking-wide truncate">
          {q.name}
        </span>
        <span className="text-[15px] font-bold tabular-nums" style={{ fontFamily: "'Roboto Mono', monospace" }}>
          {q.currency === 'BRL' && q.symbol === 'USDBRL' ? 'R$ ' : ''}
          {fmt(q.price, q.currency)}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-sm leading-none">{up ? '▲' : '▼'}</span>
        <span className="text-[12px] font-semibold tabular-nums" style={{ fontFamily: "'Roboto Mono', monospace" }}>
          {up ? '+' : ''}{q.change.toFixed(2)}{'  '}
          {up ? '+' : ''}{q.changePercent.toFixed(2)}%
        </span>
      </div>
      {updatedAt && (
        <div className="mt-1.5 text-[9px] uppercase tracking-wider text-white/60">
          Últ. atualização {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

export function HomeMarketsSection() {
  const [tab, setTab] = useState<CategoryKey>('brasil');
  const [tickerQuotes, setTickerQuotes] = useState<Quote[]>([]);
  const [globalQuotes, setGlobalQuotes] = useState<Quote[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTicker = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('market-ticker');
      if (error) throw error;
      if (data?.quotes?.length) {
        setTickerQuotes(data.quotes);
        setUpdatedAt(new Date());
      }
    } catch (err) {
      console.error('markets section fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGlobal = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('market-sparklines', {
        body: { preset: 'global_indices' },
      });
      if (error) throw error;
      if (data?.quotes?.length) setGlobalQuotes(data.quotes);
    } catch (err) {
      console.error('global indices fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchTicker();
    const t = setInterval(fetchTicker, 60_000);
    return () => clearInterval(t);
  }, [fetchTicker]);

  // Europe/Asia only when (and while) the Global tab is open
  useEffect(() => {
    if (tab !== 'global') return;
    fetchGlobal();
    const t = setInterval(fetchGlobal, 60_000);
    return () => clearInterval(t);
  }, [tab, fetchGlobal]);

  const quotes = useMemo(() => {
    const pool = tab === 'global' ? globalQuotes : tickerQuotes;
    const wanted = CATEGORIES.find((c) => c.key === tab)!.symbols;
    return wanted
      .map((s) => pool.find((q) => q.symbol === s))
      .filter((q): q is Quote => !!q);
  }, [tab, tickerQuotes, globalQuotes]);

  return (
    <div className="bg-card rounded-xl border p-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto scrollbar-thin">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setTab(c.key)}
            className={cn(
              'px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider whitespace-nowrap rounded-md transition-colors border-b-2',
              tab === c.key
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading && quotes.length === 0 ? (
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[84px] flex-1 min-w-[190px] rounded-lg" />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Cotações indisponíveis no momento.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {quotes.map((q) => (
            <QuoteCard key={q.symbol} q={q} updatedAt={updatedAt} />
          ))}
        </div>
      )}
    </div>
  );
}
