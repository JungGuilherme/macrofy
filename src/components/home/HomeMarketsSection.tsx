import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  updatedAt?: Date | null;
}

/* CNBC-style category strip.
   Primary source: market_quotes cache (GitHub Actions → Yahoo, every 15 min,
   any symbol). Live overlay: market-ticker edge function (every 60s) for the
   symbols it covers — freshest value wins. */

interface Entry {
  name: string;
  cache: string;       // symbol in market_quotes (Yahoo notation)
  live?: string;       // symbol in the market-ticker function, when covered
  suffix?: string;     // e.g. '%' for yields
  prefix?: string;
}

const CATEGORIES: { key: string; label: string; entries: Entry[] }[] = [
  {
    key: 'brasil', label: 'Brasil',
    entries: [
      { name: 'IBOVESPA', cache: '^BVSP', live: '^BVSP' },
      { name: 'IFIX', cache: 'IFIX.SA', live: 'IFIX' },
      { name: 'SMALL CAPS', cache: 'SMAL11.SA' },
      { name: 'DÓLAR', cache: 'BRL=X', live: 'USDBRL', prefix: 'R$ ' },
    ],
  },
  {
    key: 'eua', label: 'EUA',
    entries: [
      { name: 'S&P 500', cache: '^GSPC', live: '^GSPC' },
      { name: 'NASDAQ', cache: '^IXIC', live: '^IXIC' },
      { name: 'DOW JONES', cache: '^DJI', live: '^DJI' },
      { name: 'US 10Y', cache: '^TNX', suffix: '%' },
    ],
  },
  {
    key: 'asia', label: 'Ásia',
    entries: [
      { name: 'NIKKEI 225', cache: '^N225' },
      { name: 'SHANGHAI', cache: '000001.SS' },
      { name: 'HANG SENG', cache: '^HSI' },
      { name: 'TAIEX', cache: '^TWII' },
    ],
  },
  {
    key: 'europa', label: 'Europa',
    entries: [
      { name: 'EURO STOXX 50', cache: '^STOXX50E' },
      { name: 'DAX', cache: '^GDAXI' },
      { name: 'FTSE 100', cache: '^FTSE' },
      { name: 'CAC 40', cache: '^FCHI' },
    ],
  },
  {
    key: 'cripto', label: 'Cripto',
    entries: [
      { name: 'BITCOIN', cache: 'BTC-USD', live: 'BTC-USD' },
      { name: 'ETHEREUM', cache: 'ETH-USD', live: 'ETH-USD' },
      { name: 'SOLANA', cache: 'SOL-USD' },
      { name: 'DOGECOIN', cache: 'DOGE-USD' },
    ],
  },
  {
    key: 'commodities', label: 'Commodities',
    entries: [
      { name: 'BRENT', cache: 'BZ=F', live: 'BZ=F' },
      { name: 'WTI', cache: 'CL=F' },
      { name: 'OURO', cache: 'GC=F', live: 'GC=F' },
      { name: 'PRATA', cache: 'SI=F' },
      { name: 'MINÉRIO DE FERRO', cache: 'TIO=F' },
    ],
  },
  {
    key: 'agro', label: 'Agro',
    entries: [
      { name: 'BOI GORDO (CME)', cache: 'LE=F' },
      { name: 'SOJA', cache: 'ZS=F' },
      { name: 'MILHO', cache: 'ZC=F' },
      { name: 'CAFÉ', cache: 'KC=F' },
      { name: 'AÇÚCAR', cache: 'SB=F' },
    ],
  },
];

function fmt(price: number, currency?: string): string {
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US';
  const digits = price >= 100 ? 2 : price >= 1 ? 2 : 4;
  return price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: digits });
}

function QuoteCard({ q, entry }: { q: Quote; entry: Entry }) {
  const up = q.changePercent >= 0;
  return (
    <div
      className={cn(
        'rounded-lg px-4 py-3 min-w-[185px] flex-1 text-white shadow-sm',
        up ? 'bg-emerald-700' : 'bg-red-700'
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wide truncate">
          {entry.name}
        </span>
        <span className="text-[15px] font-bold tabular-nums whitespace-nowrap" style={{ fontFamily: "'Roboto Mono', monospace" }}>
          {entry.prefix ?? ''}{fmt(q.price, q.currency)}{entry.suffix ?? ''}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-sm leading-none">{up ? '▲' : '▼'}</span>
        <span className="text-[12px] font-semibold tabular-nums" style={{ fontFamily: "'Roboto Mono', monospace" }}>
          {up ? '+' : ''}{q.change.toFixed(2)}{'  '}
          {up ? '+' : ''}{q.changePercent.toFixed(2)}%
        </span>
      </div>
      {q.updatedAt && (
        <div className="mt-1.5 text-[9px] uppercase tracking-wider text-white/60">
          Últ. atualização {q.updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

export function HomeMarketsSection() {
  const [tab, setTab] = useState('brasil');
  const [liveQuotes, setLiveQuotes] = useState<Quote[]>([]);
  const [liveAt, setLiveAt] = useState<Date | null>(null);

  // Cache table (any symbol; refreshed by GitHub Actions every 15 min)
  const { data: cacheQuotes = [], isLoading: cacheLoading } = useQuery({
    queryKey: ['market-quotes-cache'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('market_quotes').select('*');
      if (error) return []; // table may not exist yet — live overlay still works
      return (data ?? []).map((r: any) => ({
        symbol: r.symbol,
        name: r.name,
        price: Number(r.price),
        change: Number(r.change),
        changePercent: Number(r.change_percent),
        currency: r.currency,
        updatedAt: r.updated_at ? new Date(r.updated_at) : null,
      })) as Quote[];
    },
    refetchInterval: 5 * 60 * 1000,
  });

  // Live overlay for the symbols the edge function covers
  const [liveLoading, setLiveLoading] = useState(true);
  const fetchLive = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('market-ticker');
      if (error) throw error;
      if (data?.quotes?.length) {
        setLiveQuotes(data.quotes);
        setLiveAt(new Date());
      }
    } catch {
      /* cache still renders */
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const t = setInterval(fetchLive, 60_000);
    return () => clearInterval(t);
  }, [fetchLive]);

  const category = CATEGORIES.find((c) => c.key === tab)!;

  const cards = useMemo(() => {
    return category.entries
      .map((entry) => {
        const live = entry.live ? liveQuotes.find((q) => q.symbol === entry.live) : undefined;
        if (live) return { entry, q: { ...live, updatedAt: liveAt } };
        const cached = cacheQuotes.find((q) => q.symbol === entry.cache);
        if (cached) return { entry, q: cached };
        return null;
      })
      .filter((x): x is { entry: Entry; q: Quote } => !!x);
  }, [category, liveQuotes, liveAt, cacheQuotes]);

  // Only declare "no data" after BOTH sources finished their first attempt
  const loading = (cacheLoading || liveLoading) && cards.length === 0;

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
      {loading ? (
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[84px] flex-1 min-w-[185px] rounded-lg" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Cotações desta categoria dependem do cache de mercado — execute{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">supabase/manual/market-quotes-cache.sql</code>{' '}
          e rode o workflow "Sync Market Quotes".
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {cards.map(({ entry, q }) => (
            <QuoteCard key={entry.cache} q={q} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
