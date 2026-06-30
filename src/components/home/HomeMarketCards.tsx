import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface SparklineQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  sparkline: number[];
}

function formatPrice(price: number, currency: string) {
  if (currency === 'BRL') {
    return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildNormalizedSeries(values: number[]) {
  const series = values.filter((value) => Number.isFinite(value));

  if (series.length < 2) {
    return {
      data: [],
      minY: -0.2,
      maxY: 0.2,
    };
  }

  const firstValue = series[0] || 1;
  const normalized = series.map((value, index) => ({
    index,
    value: ((value / firstValue) - 1) * 100,
  }));

  const valuesOnly = normalized.map((point) => point.value);
  const rawMin = Math.min(...valuesOnly);
  const rawMax = Math.max(...valuesOnly);

  let minY = rawMin >= 0 ? rawMin * 0.995 : rawMin * 1.005;
  let maxY = rawMax >= 0 ? rawMax * 1.005 : rawMax * 0.995;

  const spread = maxY - minY;
  const midpoint = (maxY + minY) / 2;
  const minimumVisualSpread = 0.12;

  if (!Number.isFinite(spread) || spread <= 0) {
    minY = midpoint - minimumVisualSpread / 2;
    maxY = midpoint + minimumVisualSpread / 2;
  } else {
    const dynamicPadding = Math.max(spread * 0.12, 0.01);
    minY -= dynamicPadding;
    maxY += dynamicPadding;

    if (maxY - minY < minimumVisualSpread) {
      minY = midpoint - minimumVisualSpread / 2;
      maxY = midpoint + minimumVisualSpread / 2;
    }
  }

  return {
    data: normalized,
    minY,
    maxY,
  };
}

function MiniCard({ quote }: { quote: SparklineQuote }) {
  const isPositive = quote.changePercent >= 0;
  const color = isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
  const { data: chartData, minY, maxY } = buildNormalizedSeries(quote.sparkline);

  return (
    <div className="bg-card rounded-xl border p-4 flex flex-col justify-between min-h-[140px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {quote.name}
        </span>
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-success" />
        ) : (
          <TrendingDown className="h-4 w-4 text-destructive" />
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xl font-bold text-foreground">
            {quote.currency === 'BRL' && quote.symbol === 'USDBRL=X' ? 'R$ ' : ''}
            {formatPrice(quote.price, quote.currency)}
          </span>
          <span
            className={cn(
              'text-sm font-semibold',
              isPositive ? 'text-success' : 'text-destructive'
            )}
          >
            {isPositive ? '+' : ''}
            {quote.changePercent.toFixed(2)}%
          </span>
        </div>

        {chartData.length > 2 && (
          <div className="w-[100px] h-[48px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <YAxis hide domain={[minY, maxY]} />
                <defs>
                  <linearGradient id={`grad-${quote.symbol}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#grad-${quote.symbol})`}
                  dot={false}
                  isAnimationActive={false}
                  baseValue={minY}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <span className="text-[10px] text-muted-foreground mt-1">Yahoo Finance</span>
    </div>
  );
}

interface HomeMarketCardsProps {
  preset?: string;
  columns?: number;
}

export function HomeMarketCards({ preset, columns = 3 }: HomeMarketCardsProps = {}) {
  const [quotes, setQuotes] = useState<SparklineQuote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('market-sparklines', {
        body: preset ? { preset } : undefined,
      });
      if (error) throw error;
      if (data?.quotes?.length) setQuotes(data.quotes);
    } catch (err) {
      console.error('HomeMarketCards fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [preset]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const gridCls = columns >= 6
    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'
    : 'grid grid-cols-1 sm:grid-cols-3 gap-4';

  if (loading) {
    return (
      <div className={gridCls}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-xl" />
        ))}
      </div>
    );
  }

  if (quotes.length === 0) return null;

  return (
    <div className={gridCls}>
      {quotes.map((q) => (
        <MiniCard key={q.symbol} quote={q} />
      ))}
    </div>
  );
}
