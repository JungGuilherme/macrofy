import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface FlowRaw {
  date: string;
  foreign_flow: number;
  institutional_flow: number;
  retail_flow: number;
}

interface FlowDataPoint {
  date: string;
  foreign: number;
  institutional: number;
  retail: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 text-xs shadow-lg space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-medium">R$ {p.value} bi</span>
        </p>
      ))}
    </div>
  );
};

export default function BrazilFlowsChart() {
  const { data: rawData, isLoading } = useQuery({
    queryKey: ["brasil-flows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brasil_flows")
        .select("date, foreign_flow, institutional_flow, retail_flow")
        .order("date", { ascending: true })
        .limit(12);
      if (error) throw error;
      return data as FlowRaw[];
    },
  });

  const chartData = useMemo<FlowDataPoint[] | null>(() => {
    if (!rawData || rawData.length === 0) return null;
    return rawData.map((r) => ({
      date: r.date.slice(0, 7),
      foreign: +r.foreign_flow,
      institutional: +r.institutional_flow,
      retail: +r.retail_flow,
    }));
  }, [rawData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Fluxos de Bolsa</CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-[320px] w-full" /></CardContent>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Fluxos de Bolsa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <AlertCircle className="h-4 w-4" />
            Série de fluxos ainda não conectada.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Fluxos de Bolsa — Últimos 12 Meses</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[320px] sm:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v} bi`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="foreign" name="Estrangeiro" fill="#2563eb" radius={[3, 3, 0, 0]} />
              <Bar dataKey="institutional" name="Institucional" fill="#d4a017" radius={[3, 3, 0, 0]} />
              <Bar dataKey="retail" name="Pessoa Física" fill="#64748b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
