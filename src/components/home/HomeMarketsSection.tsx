import { useState } from 'react';
import { cn } from '@/lib/utils';
import { HomeMarketCards } from '@/components/home/HomeMarketCards';

/* CNBC-style category strip. Cards + sparkline come from the market-sparklines
   edge function (same proven path the Mercados page already uses) — one
   preset per category, fetched live on tab switch. */

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'brasil', label: 'Brasil' },
  { key: 'eua', label: 'EUA' },
  { key: 'asia', label: 'Ásia' },
  { key: 'europa', label: 'Europa' },
  { key: 'cripto', label: 'Cripto' },
  { key: 'commodities', label: 'Commodities' },
  { key: 'agro', label: 'Agro' },
];

export function HomeMarketsSection() {
  const [tab, setTab] = useState('brasil');

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

      {/* Cards — key forces a clean remount per tab so stale quotes never flash */}
      <HomeMarketCards key={tab} preset={tab} columns={4} />
    </div>
  );
}
