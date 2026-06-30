import { Calendar } from 'lucide-react';

export function EconomicAgenda() {
  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="section-header mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="section-title">Agenda Econômica</h2>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-lg">
        <iframe
          src="https://sslecal2.investing.com/?ecoDayBackground=%235e5e5e&columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&category=_employment,_economicActivity,_inflation,_centralBanks,_confidenceIndex,_balance&importance=2,3&features=datepicker,timezone&countries=32,37,5,35,4,72&calType=day&timeZone=12&lang=12"
          style={{ width: '100%', height: '467px', border: 'none' }}
          allowTransparency={true}
          title="Calendário Econômico Investing.com"
        />
      </div>
    </div>
  );
}
