import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Grid3X3 } from 'lucide-react';

/* Tabbed TradingView heatmaps. Each tab's embed is created on first open
   (lazy) and kept mounted afterwards so switching back is instant. */

interface HeatmapDef {
  key: string;
  label: string;
  script: string;
  config: (colorTheme: string) => Record<string, unknown>;
}

const HEATMAPS: HeatmapDef[] = [
  {
    key: 'brasil',
    label: 'Brasil',
    script: 'embed-widget-stock-heatmap.js',
    config: (colorTheme) => ({
      dataSource: 'IBOV', grouping: 'sector', blockSize: 'market_cap_basic',
      blockColor: 'change', locale: 'br', colorTheme,
      hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true,
      hasSymbolTooltip: true, isMonoSize: false, width: '100%', height: '100%',
    }),
  },
  {
    key: 'eua',
    label: 'EUA',
    script: 'embed-widget-stock-heatmap.js',
    config: (colorTheme) => ({
      dataSource: 'SPX500', grouping: 'sector', blockSize: 'market_cap_basic',
      blockColor: 'change', locale: 'br', colorTheme,
      hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true,
      hasSymbolTooltip: true, isMonoSize: false, width: '100%', height: '100%',
    }),
  },
  {
    key: 'etf',
    label: 'ETFs',
    script: 'embed-widget-etf-heatmap.js',
    config: (colorTheme) => ({
      dataSource: 'AllUSEtf', blockSize: 'aum', blockColor: 'change',
      grouping: 'asset_class', locale: 'br', colorTheme,
      hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true,
      hasSymbolTooltip: true, width: '100%', height: '100%',
    }),
  },
  {
    key: 'cripto',
    label: 'Cripto',
    script: 'embed-widget-crypto-coins-heatmap.js',
    config: (colorTheme) => ({
      dataSource: 'Crypto', blockSize: 'market_cap_calc', blockColor: '24h_close_change|5',
      locale: 'br', colorTheme, hasTopBar: false, isDataSetEnabled: false,
      isZoomEnabled: true, hasSymbolTooltip: true, width: '100%', height: '100%',
    }),
  },
];

function HeatmapFrame({ def, active }: { def: HeatmapDef; active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const colorTheme = theme === 'light' ? 'light' : 'dark';

  useEffect(() => {
    if (active && !mounted) setMounted(true);
  }, [active, mounted]);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    wrapper.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://s3.tradingview.com/external-embedding/${def.script}`;
    script.async = true;
    script.innerHTML = JSON.stringify(def.config(colorTheme));
    wrapper.appendChild(script);

    container.appendChild(wrapper);
    return () => {
      container.innerHTML = '';
    };
  }, [mounted, colorTheme, def]);

  return (
    <div
      ref={containerRef}
      className={cn('w-full h-[420px]', !active && 'hidden')}
    />
  );
}

export function HomeHeatmaps() {
  const [tab, setTab] = useState('brasil');

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Heatmaps</h3>
        </div>
        <div className="flex items-center gap-1">
          {HEATMAPS.map((h) => (
            <button
              key={h.key}
              onClick={() => setTab(h.key)}
              className={cn(
                'px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors border-b-2',
                tab === h.key
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg overflow-hidden border border-border">
        {HEATMAPS.map((h) => (
          <HeatmapFrame key={h.key} def={h} active={tab === h.key} />
        ))}
      </div>
    </div>
  );
}
