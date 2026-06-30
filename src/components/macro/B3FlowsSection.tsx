import { useMemo, useState } from "react";
import {
  ComposedChart, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlertCircle, Clock, RefreshCw, BarChart3, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── Types ──────────────────────────────────────────────────── */
interface B3Flow {
  date: string;
  foreign_flow: number;
  institutional: number;
  financial_institutions: number;
  individual: number;
  others: number;
}

type ViewMode = "weekly" | "cumulative";
type PeriodFilter = "3M" | "6M" | "YTD" | "1A" | "ALL";
type InvestorKey = "foreign" | "institutional" | "individual" | "financial" | "others";

const INVESTOR_KEYS: InvestorKey[] = ["foreign", "institutional", "individual", "financial", "others"];

const INVESTOR_COLORS: Record<InvestorKey, string> = {
  foreign: "#2563eb",
  institutional: "#d4a017",
  individual: "#ef4444",
  financial: "#10b981",
  others: "#64748b",
};

const INVESTOR_LABELS: Record<InvestorKey, string> = {
  foreign: "Estrangeiro",
  institutional: "Institucional",
  individual: "Pessoa Física",
  financial: "Inst. Financeiras",
  others: "Outros",
};

/* ─── Helpers ────────────────────────────────────────────────── */
const fmtMi = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1e3) return `R$ ${(v / 1e3).toFixed(1)} bi`;
  return `R$ ${v.toFixed(0)} mi`;
};

const fmtDateShort = (d: string) => {
  const parts = d.split("-");
  if (parts.length >= 2) return `${parts[1]}/${parts[0]?.slice(2)}`;
  return d;
};

function getStartDate(filter: PeriodFilter): Date | null {
  const now = new Date();
  switch (filter) {
    case "3M": return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6M": return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "YTD": return new Date(now.getFullYear(), 0, 1);
    case "1A": return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "ALL": return null;
  }
}

/* ─── Aggregate daily → weekly ────────────────────────────────── */
function aggregateWeekly(data: B3Flow[]) {
  const buckets: Record<string, Record<InvestorKey, number>> = {};

  for (const row of data) {
    const d = new Date(row.date + "T12:00:00");
    const dayOfWeek = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek + 1);
    const key = monday.toISOString().slice(0, 10);

    if (!buckets[key]) {
      buckets[key] = { foreign: 0, institutional: 0, individual: 0, financial: 0, others: 0 };
    }
    buckets[key].foreign += row.foreign_flow;
    buckets[key].institutional += row.institutional;
    buckets[key].individual += row.individual;
    buckets[key].financial += row.financial_institutions;
    buckets[key].others += row.others;
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, vals]) => {
      const friday = new Date(week + "T12:00:00");
      friday.setDate(friday.getDate() + 4); // Monday + 4 = Friday
      const dd = String(friday.getDate()).padStart(2, "0");
      const mm = String(friday.getMonth() + 1).padStart(2, "0");
      return {
        week,
        label: `${dd}/${mm}`,
        ...Object.fromEntries(
          Object.entries(vals).map(([k, v]) => [k, Math.round(v * 100) / 100])
        ),
      };
    });
}

/* ─── Moving Average (4-week window) ─────────────────────────── */
function addMovingAverage(data: any[], key: InvestorKey, window = 4) {
  const maKey = `ma28_${key}`;
  return data.map((point, i) => {
    if (i < window - 1) return { ...point, [maKey]: null };
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += (data[j][key] ?? 0);
    return { ...point, [maKey]: Math.round((sum / window) * 100) / 100 };
  });
}

/* ─── Cumulative sum ──────────────────────────────────────────── */
function buildCumulative(data: B3Flow[]) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const accum: Record<InvestorKey, number> = {
    foreign: 0, institutional: 0, individual: 0, financial: 0, others: 0,
  };

  return sorted.map((row) => {
    accum.foreign += row.foreign_flow;
    accum.institutional += row.institutional;
    accum.individual += row.individual;
    accum.financial += row.financial_institutions;
    accum.others += row.others;

    return {
      date: row.date,
      label: fmtDateShort(row.date),
      foreign: Math.round(accum.foreign * 100) / 100,
      institutional: Math.round(accum.institutional * 100) / 100,
      individual: Math.round(accum.individual * 100) / 100,
      financial: Math.round(accum.financial * 100) / 100,
      others: Math.round(accum.others * 100) / 100,
    };
  });
}

/* ─── Tooltip ────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 text-xs shadow-lg space-y-1 z-50">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-medium">{fmtMi(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────── */
export default function B3FlowsSection() {
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [period, setPeriod] = useState<PeriodFilter>("6M");
  const [selectedInvestors, setSelectedInvestors] = useState<InvestorKey[]>(["foreign", "institutional", "individual"]);

  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ["b3-flow-daily"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("b3_flow_daily")
        .select("date, foreign_flow, institutional, financial_institutions, individual, others")
        .order("date", { ascending: true });
      if (error) throw error;
      return data as B3Flow[];
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-b3-flows");
      if (error) throw error;
      toast.info("Sincronização iniciada. Dados atualizarão em segundos...");
      setTimeout(() => { refetch(); setSyncing(false); }, 15000);
    } catch (err: any) {
      toast.error(`Erro ao sincronizar: ${err.message}`);
      setSyncing(false);
    }
  };

  // Filter by period
  const filteredData = useMemo(() => {
    if (!rawData?.length) return [];
    const start = getStartDate(period);
    if (!start) return rawData;
    const startStr = start.toISOString().slice(0, 10);
    return rawData.filter((r) => r.date >= startStr);
  }, [rawData, period]);

  const weeklyData = useMemo(() => aggregateWeekly(filteredData), [filteredData]);
  const cumulativeData = useMemo(() => buildCumulative(filteredData), [filteredData]);

  // Thin out cumulative data for readability (max ~60 points)
  const thinCumData = useMemo(() => {
    if (cumulativeData.length <= 60) return cumulativeData;
    const step = Math.ceil(cumulativeData.length / 60);
    return cumulativeData.filter((_, i) => i % step === 0 || i === cumulativeData.length - 1);
  }, [cumulativeData]);

  const lastDate = rawData?.length ? rawData[rawData.length - 1].date : null;

  const toggleInvestor = (key: InvestorKey) => {
    setSelectedInvestors((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Fluxo B3 por Investidor</CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-[400px] w-full" /></CardContent>
      </Card>
    );
  }

  if (!rawData?.length) {
    return (
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Fluxo B3 por Investidor</CardTitle>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <AlertCircle className="h-4 w-4" />
            Nenhum dado disponível. Clique em Sincronizar para buscar.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-base font-semibold text-foreground">Fluxo B3 por Investidor</h3>
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="h-3 w-3" />
            D+2
          </Badge>
          {lastDate && (
            <span className="text-xs text-muted-foreground">
              Até: {lastDate.split("-").reverse().join("/")}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </div>

      {/* Chart Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* View toggle */}
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && setViewMode(v as ViewMode)}
              size="sm"
            >
              <ToggleGroupItem value="weekly" className="gap-1 text-xs px-3">
                <BarChart3 className="h-3.5 w-3.5" />
                Variação semanal
              </ToggleGroupItem>
              <ToggleGroupItem value="cumulative" className="gap-1 text-xs px-3">
                <TrendingUp className="h-3.5 w-3.5" />
                Acumulado
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Period filter */}
            <div className="flex gap-1 flex-wrap">
              {(["3M", "6M", "YTD", "1A", "ALL"] as PeriodFilter[]).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setPeriod(p)}
                >
                  {p === "ALL" ? "Histórico" : p}
                </Button>
              ))}
            </div>
          </div>

          {/* Investor toggles */}
          <div className="flex gap-2 flex-wrap mt-2">
            {INVESTOR_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => toggleInvestor(key)}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                  selectedInvestors.includes(key)
                    ? "border-current opacity-100"
                    : "border-border opacity-40"
                }`}
                style={{ color: INVESTOR_COLORS[key] }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: INVESTOR_COLORS[key] }}
                />
                {INVESTOR_LABELS[key]}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {viewMode === "weekly" ? (
            <div className="space-y-6">
              {selectedInvestors.map((key) => {
                const chartData = addMovingAverage(weeklyData, key);
                const maKey = `ma28_${key}`;
                return (
                  <div key={key}>
                    <p className="text-sm font-medium mb-2" style={{ color: INVESTOR_COLORS[key] }}>
                      {INVESTOR_LABELS[key]}
                    </p>
                    <div className="h-[220px] sm:h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: number) => `${v.toFixed(0)}`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar
                            dataKey={key}
                            name={INVESTOR_LABELS[key]}
                            fill={INVESTOR_COLORS[key]}
                            radius={[2, 2, 0, 0]}
                            opacity={0.7}
                          />
                          <Line
                            type="monotone"
                            dataKey={maKey}
                            name="MM 28d"
                            stroke={INVESTOR_COLORS[key]}
                            strokeWidth={2}
                            strokeDasharray="5 3"
                            dot={false}
                            connectNulls={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[340px] sm:h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={thinCumData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => {
                      if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}bi`;
                      return `${v.toFixed(0)}mi`;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {selectedInvestors.map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={INVESTOR_LABELS[key]}
                      stroke={INVESTOR_COLORS[key]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source disclaimer */}
      <p className="text-[11px] text-muted-foreground italic">
        ⚠️ Dados com defasagem de D+2 (dois dias úteis). Fonte: Dados de Mercado / B3.
      </p>
    </div>
  );
}
