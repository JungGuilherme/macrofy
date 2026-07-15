import { Calendar } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// Investing.com calendar is a cross-origin iframe — its internals can't be
// styled. In dark themes we approximate integration with a color-inversion
// filter (hue-rotate keeps reds red / greens green).
export function EconomicAgenda() {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'bloomberg';

  // Cross-origin iframe: color control is filter-only. Dark inverts;
  // bloomberg adds a sepia pass that pushes the inverted whites to amber.
  const filter =
    theme === 'bloomberg'
      ? 'invert(0.92) hue-rotate(180deg) sepia(0.6) saturate(1.7) hue-rotate(-12deg) contrast(0.98)'
      : isDark
        ? 'invert(0.90) hue-rotate(180deg) contrast(0.95)'
        : undefined;

  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="section-header mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="section-title">Agenda Econômica</h2>
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Investing.com
        </span>
      </div>

      <div className="w-full overflow-hidden rounded-lg border border-border">
        <iframe
          src="https://sslecal2.investing.com/?ecoDayBackground=%235e5e5e&columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&category=_employment,_economicActivity,_inflation,_centralBanks,_confidenceIndex,_balance&importance=2,3&features=datepicker,timezone&countries=32,37,5,35,4,72&calType=day&timeZone=12&lang=12"
          style={{
            width: 'calc(100% + 2px)',
            height: '467px',
            border: 'none',
            marginLeft: '-1px',
            display: 'block',
            filter,
          }}
          allowTransparency={true}
          title="Calendário Econômico Investing.com"
        />
      </div>
    </div>
  );
}
