import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketQuote } from '@/data/mockData';

interface MarketCardProps {
  quote: MarketQuote;
}

export function MarketCard({ quote }: MarketCardProps) {
  const isPositive = quote.changePercent > 0;
  const isNegative = quote.changePercent < 0;
  const isNeutral = quote.changePercent === 0;

  const formatValue = (value: number, ticker: string) => {
    if (ticker.includes('BRL')) {
      return `R$ ${value.toFixed(2)}`;
    }
    if (ticker === 'BTC') {
      return `$${value.toLocaleString('en-US')}`;
    }
    if (value > 1000) {
      return value.toLocaleString('pt-BR');
    }
    return value.toFixed(2);
  };

  return (
    <div
      className={cn(
        'market-card',
        isPositive && 'market-card-positive',
        isNegative && 'market-card-negative'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {quote.ticker}
        </span>
        {isPositive && <TrendingUp className="h-3.5 w-3.5 text-success" />}
        {isNegative && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
        {isNeutral && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <p className="text-lg font-semibold text-foreground">
        {formatValue(quote.value, quote.ticker)}
      </p>
      <p
        className={cn(
          'text-sm font-medium',
          isPositive && 'text-success',
          isNegative && 'text-destructive',
          isNeutral && 'text-muted-foreground'
        )}
      >
        {isPositive && '+'}
        {quote.changePercent.toFixed(2)}%
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{quote.name}</p>
    </div>
  );
}
