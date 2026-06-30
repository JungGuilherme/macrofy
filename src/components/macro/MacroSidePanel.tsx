import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useMacroSeriesHistory,
  MacroMetadata,
} from "@/hooks/useMacroData";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  seriesCode: string | null;
  country: string;
  metadata: MacroMetadata[] | undefined;
  onClose: () => void;
}

function StatCard({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string;
  accent?: "green" | "red";
  small?: boolean;
}) {
  return (
    <div
      className={`rounded-lg bg-muted/50 ${small ? "p-2" : "p-3"}`}
    >
      <p
        className={`text-muted-foreground ${
          small ? "text-[10px]" : "text-xs"
        }`}
      >
        {label}
      </p>
      <p
        className={`font-mono font-semibold ${
          small ? "text-sm" : "text-lg"
        }`}
        style={{
          color:
            accent === "green"
              ? "hsl(var(--success))"
              : accent === "red"
              ? "hsl(var(--destructive))"
              : undefined,
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default function MacroSidePanel({
  seriesCode,
  country,
  metadata,
  onClose,
}: Props) {
  const { data: history } = useMacroSeriesHistory(seriesCode, country);

  const meta = useMemo(() => {
    if (!metadata || !seriesCode) return null;
    return metadata.find(
      (m) => m.series_code === seriesCode && m.country === country
    );
  }, [metadata, seriesCode, country]);

  const stats = useMemo(() => {
    if (!history || history.length === 0) return null;
    const last = history[history.length - 1];
    const last12 = history.slice(-12);
    const values12 = last12
      .map((d) => d.raw_value)
      .filter((v): v is number => v !== null);

    return {
      lastValue: last.display_value || String(last.raw_value),
      lastDate: last.date,
      mom: last.mom_value,
      yoy: last.yoy_value,
      ma3: last.ma3_value,
      ma12: last.ma12_value,
      max12: values12.length > 0 ? Math.max(...values12) : null,
      min12: values12.length > 0 ? Math.min(...values12) : null,
    };
  }, [history]);

  const chartData = useMemo(() => {
    if (!history) return [];
    return history.map((d) => ({
      date: d.date,
      value: d.raw_value,
      label: new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      }),
    }));
  }, [history]);

  const polarityAccent = (val: number | null) => {
    if (val === null) return undefined;
    const isPositive = meta?.polarity === "negative" ? val <= 0 : val >= 0;
    return isPositive ? ("green" as const) : ("red" as const);
  };

  return (
    <Sheet open={!!seriesCode} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[440px] sm:w-[520px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">
            {meta?.indicator || seriesCode}
          </SheetTitle>
          {meta && (
            <p className="text-xs text-muted-foreground">
              {meta.source} · {meta.series_code} · {meta.notes}
            </p>
          )}
        </SheetHeader>

        {stats && (
          <div className="mt-6 space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Último Valor" value={stats.lastValue} />
              <StatCard
                label="Var. M/M"
                value={
                  stats.mom !== null
                    ? `${stats.mom >= 0 ? "+" : ""}${stats.mom.toFixed(2)}%`
                    : "—"
                }
                accent={polarityAccent(stats.mom)}
              />
              <StatCard
                label="Var. A/A"
                value={
                  stats.yoy !== null
                    ? `${stats.yoy >= 0 ? "+" : ""}${stats.yoy.toFixed(2)}%`
                    : "—"
                }
                accent={polarityAccent(stats.yoy)}
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              <StatCard
                label="Média 3m"
                value={
                  stats.ma3 !== null ? stats.ma3.toFixed(2) : "—"
                }
                small
              />
              <StatCard
                label="Média 12m"
                value={
                  stats.ma12 !== null ? stats.ma12.toFixed(2) : "—"
                }
                small
              />
              <StatCard
                label="Máx 12m"
                value={
                  stats.max12 !== null ? stats.max12.toFixed(2) : "—"
                }
                small
              />
              <StatCard
                label="Mín 12m"
                value={
                  stats.min12 !== null ? stats.min12.toFixed(2) : "—"
                }
                small
              />
            </div>

            {/* Chart */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Histórico
              </p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      domain={["auto", "auto"]}
                      width={60}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [
                        value?.toFixed(2),
                        meta?.indicator,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Color scale legend */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Escala de Cor (Z-Score)
              </p>
              <div className="flex gap-1">
                {[
                  { color: "hsl(0, 71%, 28%)", label: "≤ -1.25" },
                  { color: "hsl(0, 45%, 35%)", label: "-0.40" },
                  { color: "hsl(220, 10%, 25%)", label: "Neutro" },
                  { color: "hsl(142, 45%, 35%)", label: "+0.40" },
                  { color: "hsl(142, 71%, 28%)", label: "≥ +1.25" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex-1 text-center">
                    <div
                      className="h-4 rounded-sm mb-1"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              {meta && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Polaridade:{" "}
                  {meta.polarity === "positive"
                    ? "↑ maior = melhor (atividade, confiança)"
                    : "↓ menor = melhor (inflação, desemprego, juros)"}
                </p>
              )}
            </div>

            {/* Metadata */}
            <div className="border-t border-border pt-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                Detalhes da Série
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-muted-foreground">Fonte:</span>
                <span className="text-foreground">{meta?.source}</span>
                <span className="text-muted-foreground">Código:</span>
                <span className="text-foreground font-mono">
                  {meta?.series_code}
                </span>
                <span className="text-muted-foreground">Frequência:</span>
                <span className="text-foreground">{meta?.frequency}</span>
                <span className="text-muted-foreground">Unidade:</span>
                <span className="text-foreground">{meta?.unit}</span>
                <span className="text-muted-foreground">
                  Última atualização:
                </span>
                <span className="text-foreground">{stats.lastDate}</span>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
