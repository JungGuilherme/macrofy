import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/useCalendarEvents";

type CountryFilter = "all" | "BR" | "US";

function CountryBadge({ country }: { country: "BR" | "US" }) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold px-1.5 py-0.5 rounded",
        country === "BR" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
      )}
    >
      {country === "BR" ? "BR" : "EUA"}
    </span>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function groupByDate<T extends { event_date: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const arr = map.get(r.event_date);
    if (arr) arr.push(r);
    else map.set(r.event_date, [r]);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function EarningsTab({ country }: { country: CountryFilter }) {
  const { data: brData, isLoading: brLoading } = useCalendarEvents("earnings", "BR");
  const { data: usData, isLoading: usLoading } = useCalendarEvents("earnings", "US");

  const rows = useMemo(() => {
    const all = [...(brData || []), ...(usData || [])];
    const today = new Date().toISOString().slice(0, 10);
    const filtered = all.filter((r) => r.event_date >= today);
    if (country === "all") return filtered;
    return filtered.filter((r) => r.country === country);
  }, [brData, usData, country]);

  if (brLoading || usLoading) return <Skeleton className="h-[300px] w-full" />;
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Sem resultados futuros carregados ainda.</p>;
  }

  const groups = groupByDate(rows);

  return (
    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
      {groups.map(([date, events]) => (
        <div key={date}>
          <div className="text-xs font-semibold text-muted-foreground mb-1.5 sticky top-0 bg-card py-1">{formatDate(date)}</div>
          <div className="space-y-1">
            {events.map((e) => (
              <div key={`${e.country}-${e.ticker}-${e.event_date}`} className="flex items-center justify-between gap-2 text-sm py-1 px-2 rounded-md hover:bg-muted/40">
                <div className="flex items-center gap-2 min-w-0">
                  <CountryBadge country={e.country} />
                  <span className="font-medium truncate">{e.ticker}</span>
                  <span className="text-muted-foreground truncate hidden sm:inline">{e.company_name}</span>
                </div>
                {e.time_of_day && (
                  <span className="text-[10px] uppercase text-muted-foreground flex-shrink-0">
                    {e.time_of_day === "bmo" ? "Antes da abertura" : e.time_of_day === "amc" ? "Após fechamento" : e.time_of_day}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DividendsTab() {
  const { data, isLoading } = useCalendarEvents("dividend", "BR");

  const rows = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (data || []).filter((r) => r.event_date >= today);
  }, [data]);

  if (isLoading) return <Skeleton className="h-[300px] w-full" />;
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Sem dividendos futuros carregados ainda.</p>;
  }

  const groups = groupByDate(rows);

  return (
    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
      {groups.map(([date, events]) => (
        <div key={date}>
          <div className="text-xs font-semibold text-muted-foreground mb-1.5 sticky top-0 bg-card py-1">
            Data-com {formatDate(date)}
          </div>
          <div className="space-y-1">
            {events.map((e: CalendarEvent) => (
              <div key={`${e.ticker}-${e.event_date}`} className="flex items-center justify-between gap-2 text-sm py-1 px-2 rounded-md hover:bg-muted/40">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{e.ticker}</span>
                  <span className="text-[10px] text-muted-foreground border rounded px-1 flex-shrink-0">{e.dividend_type}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                  {e.value != null && <span className="font-medium tabular-nums">R$ {e.value.toFixed(2)}</span>}
                  {e.payment_date && <span className="text-muted-foreground">pgto {formatDate(e.payment_date)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EarningsCalendarSection() {
  const [tab, setTab] = useState<"earnings" | "dividends">("earnings");
  const [country, setCountry] = useState<CountryFilter>("all");

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTab("earnings")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md border-b-2 transition-colors",
                tab === "earnings" ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              Resultados
            </button>
            <button
              onClick={() => setTab("dividends")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md border-b-2 transition-colors",
                tab === "dividends" ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              Dividendos
            </button>
          </div>

          {tab === "earnings" && (
            <div className="flex items-center gap-1 text-xs">
              {(["all", "BR", "US"] as CountryFilter[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCountry(c)}
                  className={cn(
                    "px-2 py-1 rounded-md border",
                    country === c ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  {c === "all" ? "Todos" : c === "BR" ? "Brasil" : "EUA"}
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === "earnings" ? <EarningsTab country={country} /> : <DividendsTab />}
      </CardContent>
    </Card>
  );
}
