import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MacroDataPoint } from "@/hooks/useMacroData";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CardConfig {
  title: string;
  seriesCode: string;
  valueType: "yoy" | "raw" | "fed_range";
  decimals?: number;
  suffix?: string;
  getSubtitle: (latest: MacroDataPoint | null, prev: MacroDataPoint | null) => string;
}

function getSeriesData(data: MacroDataPoint[], seriesCode: string): MacroDataPoint[] {
  return data
    .filter((d) => d.series_code === seriesCode)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatDateBR(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[d.getMonth()]}/${d.getFullYear()}`;
}

function formatQuarterBR(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${q}T${d.getFullYear().toString().slice(2)}`;
}

const BR_CARDS: CardConfig[] = [
  {
    title: "PIB",
    seriesCode: "24364",
    valueType: "yoy",
    decimals: 1,
    suffix: "%",
    getSubtitle: (latest) => {
      if (!latest) return "";
      return `Acum. 12m · Último dado: ${formatDateBR(latest.date)}`;
    },
  },
  {
    title: "IPCA 12m",
    seriesCode: "13522",
    valueType: "raw",
    decimals: 2,
    suffix: "%",
    getSubtitle: () => "Meta: 3,0% (±1,5pp)",
  },
  {
    title: "Selic Meta",
    seriesCode: "432",
    valueType: "raw",
    decimals: 2,
    suffix: "% a.a.",
    getSubtitle: () => {
      // Each entry is [startDay, endDay] of the meeting
      const copomMeetings: [Date, Date][] = [
        [new Date(2026, 0, 27), new Date(2026, 0, 28)],
        [new Date(2026, 2, 17), new Date(2026, 2, 18)],
        [new Date(2026, 3, 28), new Date(2026, 3, 29)],
        [new Date(2026, 5, 16), new Date(2026, 5, 17)],
        [new Date(2026, 7, 4),  new Date(2026, 7, 5)],
        [new Date(2026, 8, 15), new Date(2026, 8, 16)],
        [new Date(2026, 10, 3), new Date(2026, 10, 4)],
        [new Date(2026, 11, 8), new Date(2026, 11, 9)],
      ];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const next = copomMeetings.find(([, end]) => end >= today);
      if (!next) return "Calendário COPOM 2026 encerrado";
      const [start, end] = next;
      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      return `Próx. COPOM: ${start.getDate()}-${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
    },
  },
  {
    title: "Dívida / PIB",
    seriesCode: "13762",
    valueType: "raw",
    decimals: 1,
    suffix: "%",
    getSubtitle: (latest) => {
      if (!latest) return "Ref. neutra: 70%";
      return `Ref. neutra: 70% · ${formatDateBR(latest.date)}`;
    },
  },
];

const US_CARDS: CardConfig[] = [
  {
    title: "PIB",
    seriesCode: "GDPC1",
    valueType: "yoy",
    decimals: 1,
    suffix: "%",
    getSubtitle: (latest) => {
      if (!latest) return "";
      return `Acum. 12m · Último dado: ${formatQuarterBR(latest.date)}`;
    },
  },
  {
    title: "PCE Core",
    seriesCode: "PCEPILFE",
    valueType: "yoy",
    decimals: 2,
    suffix: "%",
    getSubtitle: () => "12 meses · Meta Fed: 2,0%",
  },
  {
    title: "Fed Funds",
    seriesCode: "DFEDTARU",
    valueType: "fed_range",
    decimals: 2,
    suffix: "% a.a.",
    getSubtitle: () => "Intervalo-meta do FOMC",
  },
  {
    title: "Desemprego",
    seriesCode: "UNRATE",
    valueType: "raw",
    decimals: 1,
    suffix: "%",
    getSubtitle: (latest) => {
      if (!latest) return "";
      return `Último dado: ${formatDateBR(latest.date)}`;
    },
  },
];

function getValue(
  latest: MacroDataPoint | null,
  valueType: string,
  decimals: number
): string {
  if (!latest) return "—";

  if (valueType === "yoy") {
    if (latest.yoy_value === null) return "—";
    return latest.yoy_value.toFixed(decimals);
  }

  if (valueType === "fed_range") {
    if (latest.raw_value === null) return "—";
    const upper = latest.raw_value;
    const lower = upper - 0.25;
    return `${lower.toFixed(decimals)}–${upper.toFixed(decimals)}`;
  }

  // raw
  if (latest.raw_value === null) return "—";
  return latest.raw_value.toFixed(decimals);
}

interface Props {
  country: "BR" | "US";
  data: MacroDataPoint[];
}

export default function MacroSummaryCards({ country, data }: Props) {
  const cards = country === "BR" ? BR_CARDS : US_CARDS;

  const cardValues = useMemo(() => {
    return cards.map((card) => {
      const series = getSeriesData(data, card.seriesCode);
      const latest = series.length > 0 ? series[series.length - 1] : null;
      const prev = series.length > 1 ? series[series.length - 2] : null;

      const displayVal = getValue(latest, card.valueType, card.decimals ?? 2);

      // Trend based on the value type
      let trend: "up" | "down" | "flat" = "flat";
      if (latest && prev) {
        const curVal = card.valueType === "yoy" ? latest.yoy_value : latest.raw_value;
        const prevVal = card.valueType === "yoy" ? prev.yoy_value : prev.raw_value;
        if (curVal !== null && prevVal !== null) {
          if (curVal > prevVal) trend = "up";
          else if (curVal < prevVal) trend = "down";
        }
      }

      const subtitle = card.getSubtitle(latest, prev);
      return { ...card, displayVal, trend, subtitle };
    });
  }, [data, cards]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cardValues.map((card) => (
        <Card key={card.seriesCode} className="border border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.title}
              </span>
              {card.trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-success" />}
              {card.trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
              {card.trend === "flat" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {card.displayVal}
              {card.displayVal !== "—" && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {card.suffix}
                </span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
              {card.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
