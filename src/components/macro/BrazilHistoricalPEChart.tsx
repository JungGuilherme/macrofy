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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface PERaw {
  date: string;
  pe_ratio: number;
}

interface PEDataPoint {
  date: string;
  pe_ratio: number;
  mean_36m: number;
  upper_1std: number;
  lower_1std: number;
}

function computeBands(raw: PERaw[]): PEDataPoint[] {
  const sorted = [...raw].sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map((r) => r.pe_ratio);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  const m = +mean.toFixed(2);
  const upper = +(mean + std).toFixed(2);
  const lower = +(mean - std).toFixed(2);

  return sorted.map((r) => ({
    date: r.date.slice(0, 7),
    pe_ratio: +r.pe_ratio.toFixed(2),
    mean_36m: m,
    upper_1std: upper,
    lower_1std: lower,
  }));
}

function getValuationStatus(pe: number, upper: number, lower: number) {
  if (pe > upper) return { label: "Acima da banda", color: "destructive" as const };
  if (pe < lower) return { label: "Abaixo da banda", color: "default" as const };
  return { label: "Dentro da faixa", color: "secondary" as const };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as PEDataPoint;
  return (
    <div className="rounded-lg border bg-background p-3 text-xs shadow-lg space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      <p>P/L: <span className="font-medium">{d.pe_ratio}x</span></p>
      <p>Média 36m: <span className="font-medium">{d.mean_36m}x</span></p>
      <p>+1 DP: <span className="font-medium">{d.upper_1std}x</span></p>
      <p>−1 DP: <span className="font-medium">{d.lower_1std}x</span></p>
    </div>
  );
};

export default function BrazilHistoricalPEChart() {
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

  const chartData = useMemo(() => {
    if (!rawData || rawData.length === 0) return null;
    return computeBands(rawData);
  }, [rawData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">P/L Histórico da Bolsa Brasileira</CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-[320px] w-full" /></CardContent>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">P/L Histórico da Bolsa Brasileira</CardTitle>
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

  const current = chartData[chartData.length - 1];
  const status = getValuationStatus(current.pe_ratio, current.upper_1std, current.lower_1std);
  const statusText =
    current.pe_ratio > current.upper_1std ? "acima" : current.pe_ratio < current.lower_1std ? "abaixo" : "dentro";

  const yMin = Math.floor(Math.min(...chartData.map((d) => d.lower_1std)) - 1);
  const yMax = Math.ceil(Math.max(...chartData.map((d) => d.upper_1std)) + 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base font-semibold">P/L Histórico da Bolsa Brasileira</CardTitle>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              P/L atual: <span className="font-semibold text-foreground">{current.pe_ratio}x</span>
            </span>
            <span className="text-muted-foreground">
              Média 36m: <span className="font-semibold text-foreground">{current.mean_36m}x</span>
            </span>
            <Badge variant={status.color}>{status.label}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="h-[320px] sm:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis domain={[yMin, yMax]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}x`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
              <Line type="monotone" dataKey="upper_1std" name="+1 DP" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="lower_1std" name="−1 DP" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="mean_36m" name="Média 36m" stroke="#d4a017" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="pe_ratio" name="P/L" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#2563eb" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          O P/L da bolsa brasileira está em{" "}
          <span className="font-medium text-foreground">{current.pe_ratio}x</span>, frente à média de{" "}
          <span className="font-medium text-foreground">{current.mean_36m}x</span> nos últimos 36 meses, posicionando-se{" "}
          <span className="font-medium">{statusText}</span> da faixa histórica.
        </p>
      </CardContent>
    </Card>
  );
}
