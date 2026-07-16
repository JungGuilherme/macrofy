import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
  updatedAt?: Date | null;
  sparkline?: number[];
}

/** Normalize a raw price series into %-from-first-point, for the sparkline. */
function normalizeSeries(values: number[] = []) {
  const series = values.filter((v) => Number.isFinite(v));
  if (series.length < 3) return { data: [] as { i: number; v: number }[], minY: -0.2, maxY: 0.2 };
  const first = series[0] || 1;
  const data = series.map((v, i) => ({ i, v: ((v / first) - 1) * 100 }));
  const vals = data.map((d) => d.v);
  let minY = Math.min(...vals);
  let maxY = Math.max(...vals);
  const pad = Math.max((maxY - minY) * 0.15, 0.02);
  minY -= pad; maxY += pad;
  if (maxY - minY < 0.1) { const mid = (maxY + minY) / 2; minY = mid - 0.05; maxY = mid + 0.05; }
  return { data, minY, maxY };
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

type ThemeName = 'light' | 'dark' | 'bloomberg';

function QuoteCard({ q, entry, theme }: { q: Quote; entry: Entry; theme: ThemeName }) {
  const up = q.changePercent >= 0;
  const color = up ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
  const { data: chartData, minY, maxY } = normalizeSeries(q.sparkline);

  const box = cn(
    'rounded-xl px-4 py-3 min-w-[190px] flex-1 flex flex-col justify-between min-h-[112px]',
    theme === 'bloomberg' ? 'bg-black border border-yellow-400/40' : 'bg-card border border-border'
  );
  const nameCls = cn(
    'text-[11px] font-medium uppercase tracking-wide truncate',
    theme === 'bloomberg' ? 'text-yellow-400/80' : 'text-muted-foreground'
  );
  const priceCls = cn(
    'text-xl font-bold tabular-nums whitespace-nowrap',
    theme === 'bloomberg' ? 'text-yellow-400' : 'text-foreground'
  );
  const timeCls = cn(
    'text-[10px] mt-1',
    theme === 'bloomberg' ? 'text-yellow-400/40' : 'text-muted-foreground'
  );

  return (
    <div className={box}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={nameCls}>{entry.name}</span>
        {up
          ? <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" style={{ color }} />
          : <TrendingDown className="h-3.5 w-3.5 flex-shrink-0" style={{ color }} />}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className={priceCls}>
            {entry.prefix ?? ''}{fmt(q.price, q.currency)}{entry.suffix ?? ''}
          </span>
          <span className="text-sm font-semibold" style={{ color }}>
            {up ? '+' : ''}{q.changePercent.toFixed(2)}%
          </span>
        </div>

        {chartData.length > 2 && (
          <div className="w-[90px] h-[42px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <YAxis hide domain={[minY, maxY]} />
                <defs>
                  <linearGradient id={`grad-${entry.cache}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
                  fill={`url(#grad-${entry.cache})`} dot={false} isAnimationActive={false} baseValue={minY}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className={timeCls}>
        Yahoo Finance
        {q.updatedAt && ` · ${q.updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
      </div>
    </div>
  );
}

export function HomeMarketsSection() {
  const { theme } = useTheme();
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
        sparkline: Array.isArray(r.sparkline) ? r.sparkline.map(Number) : [],
      })) as Quote[];
    },
    // Actions refreshes the table ~every 5 min; re-read often so new rows
    // show up right after each run.
    refetchInterval: 60 * 1000,
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
        const cached = cacheQuotes.find((q) => q.symbol === entry.cache);
        // market-ticker has no sparkline; borrow the cache's series for the chart.
        if (live) return { entry, q: { ...live, updatedAt: liveAt, sparkline: cached?.sparkline } };
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
            <Skeleton key={i} className="h-[112px] flex-1 min-w-[190px] rounded-xl" />
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
            <QuoteCard key={entry.cache} q={q} entry={entry} theme={theme as ThemeName} />
          ))}
        </div>
      )}
    </div>
  );
}
