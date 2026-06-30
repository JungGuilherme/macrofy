import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PERaw {
  date: string;
  pe_ratio: number;
}

interface PEDataPoint {
  date: string;
  label: string;
  pe_ratio: number;
  mean_36m: number;
  upper_1std: number;
  lower_1std: number;
}

interface Stats {
  current: number;
  mean: number;
  upper: number;
  lower: number;
  classification: "below" | "inline" | "above";
}

function computeData(raw: PERaw[]): { data: PEDataPoint[]; stats: Stats } | null {
  if (!raw || raw.length === 0) return null;

  const sorted = [...raw].sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map((r) => r.pe_ratio);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);

  const m = +mean.toFixed(2);
  const upper = +(mean + std).toFixed(2);
  const lower = +(mean - std).toFixed(2);

  const data = sorted.map((r) => {
    const d = new Date(r.date + "T12:00:00");
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return {
      date: r.date.slice(0, 7),
      label: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      pe_ratio: +r.pe_ratio.toFixed(2),
      mean_36m: m,
      upper_1std: upper,
      lower_1std: lower,
    };
  });

  const current = data[data.length - 1].pe_ratio;
  const classification: Stats["classification"] =
    current > upper ? "above" : current < lower ? "below" : "inline";

  return { data, stats: { current, mean: m, upper, lower, classification } };
}

const classificationConfig = {
  below: {
    label: "Abaixo da média",
    color: "default" as const,
    icon: TrendingDown,
    comment:
      "O valuation da bolsa está abaixo da banda inferior do período, sugerindo nível relativamente descontado frente ao histórico recente.",
  },
  inline: {
    label: "Em linha com a média",
    color: "secondary" as const,
    icon: Minus,
    comment:
      "O valuation da bolsa está dentro da faixa histórica observada nos últimos 36 meses.",
  },
  above: {
    label: "Acima da média",
    color: "destructive" as const,
    icon: TrendingUp,
    comment:
      "O valuation da bolsa está acima da banda superior do período, sugerindo prêmio relevante frente ao histórico recente.",
  },
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as PEDataPoint;
  const distFromMean = +(d.pe_ratio - d.mean_36m).toFixed(2);
  const sign = distFromMean > 0 ? "+" : "";

  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 text-xs shadow-xl space-y-1.5">
      <p className="font-semibold text-foreground text-sm">{d.label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-muted-foreground">P/L:</span>
        <span className="font-semibold text-foreground text-right">{d.pe_ratio}x</span>
        <span className="text-muted-foreground">Média 36m:</span>
        <span className="font-medium text-right">{d.mean_36m}x</span>
        <span className="text-muted-foreground">Dist. da média:</span>
        <span className={`font-medium text-right ${distFromMean > 0 ? "text-destructive" : distFromMean < 0 ? "text-green-600" : ""}`}>
          {sign}{distFromMean}x
        </span>
        <span className="text-muted-foreground">+1 DP:</span>
        <span className="font-medium text-right">{d.upper_1std}x</span>
        <span className="text-muted-foreground">−1 DP:</span>
        <span className="font-medium text-right">{d.lower_1std}x</span>
      </div>
    </div>
  );
};

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export default function BrazilValuationSection() {
  const { data: rawData, isLoading } = useQuery({
    queryKey: ["brasil-pe-historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brasil_pe_historico")
        .select("date, pe_ratio")
        .order("date", { ascending: true })
        .limit(36);
      if (error) throw error;
      return data as PERaw[];
    },
  });

  const result = useMemo(() => computeData(rawData ?? []), [rawData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Valuation da Bolsa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-[360px]" />
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Valuation da Bolsa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <AlertCircle className="h-4 w-4" />
            Série histórica de P/L ainda não disponível. Sincronize os dados via brapi.
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data: chartData, stats } = result;
  const config = classificationConfig[stats.classification];
  const StatusIcon = config.icon;

  const yMin = Math.floor(Math.min(...chartData.map((d) => Math.min(d.lower_1std, d.pe_ratio))) - 1);
  const yMax = Math.ceil(Math.max(...chartData.map((d) => Math.max(d.upper_1std, d.pe_ratio))) + 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold">P/L Histórico da Bolsa Brasileira</CardTitle>
            <CardDescription className="mt-1">
              Evolução do múltiplo Preço/Lucro nos últimos 36 meses, com bandas de desvio-padrão em relação à média do período.
            </CardDescription>
          </div>
          <Badge variant={config.color} className="flex items-center gap-1.5 self-start">
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="P/L Atual" value={`${stats.current}x`} subtitle="Último dado disponível" />
          <StatCard label="Média 36m" value={`${stats.mean}x`} subtitle="Média do período" />
          <StatCard label="+1 Desvio" value={`${stats.upper}x`} subtitle="Banda superior" />
          <StatCard label="−1 Desvio" value={`${stats.lower}x`} subtitle="Banda inferior" />
          <StatCard
            label="Classificação"
            value={config.label}
            subtitle={`${stats.current > stats.mean ? "+" : ""}${(stats.current - stats.mean).toFixed(2)}x da média`}
          />
        </div>

        {/* Chart */}
        <div className="h-[360px] sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}x`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="plainline"
              />

              {/* Bands */}
              <Line
                type="monotone"
                dataKey="upper_1std"
                name="+1 Desvio Padrão"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="6 4"
                strokeWidth={1}
                dot={false}
                strokeOpacity={0.6}
              />
              <Line
                type="monotone"
                dataKey="lower_1std"
                name="−1 Desvio Padrão"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="6 4"
                strokeWidth={1}
                dot={false}
                strokeOpacity={0.6}
              />

              {/* Mean */}
              <Line
                type="monotone"
                dataKey="mean_36m"
                name="Média 36 meses"
                stroke="#d4a017"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                dot={false}
              />

              {/* P/L line */}
              <Line
                type="monotone"
                dataKey="pe_ratio"
                name="P/L"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))", fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Analytical comment */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm leading-relaxed text-foreground/80">
            {config.comment}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            P/L atual em{" "}
            <span className="font-semibold text-foreground">{stats.current}x</span>
            {" "}vs. média de{" "}
            <span className="font-semibold text-foreground">{stats.mean}x</span>
            {" "}({stats.current > stats.mean ? "+" : ""}{(stats.current - stats.mean).toFixed(2)}x).
            Bandas: [{stats.lower}x – {stats.upper}x].
          </p>
        </div>
      </CardContent>
    </Card>
  );
}