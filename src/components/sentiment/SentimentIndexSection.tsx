import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSentimentIndex } from "@/hooks/useSentimentIndex";
import SentimentGauge from "./SentimentGauge";
import SentimentHistoryChart from "./SentimentHistoryChart";
import SentimentComponentCards from "./SentimentComponentCards";

const PERIODS = [
  { key: "1m", label: "1M", days: 30 },
  { key: "3m", label: "3M", days: 90 },
  { key: "6m", label: "6M", days: 180 },
  { key: "ytd", label: "YTD", days: -1 },
  { key: "1a", label: "1A", days: 365 },
  { key: "all", label: "Histórico", days: 0 },
];

interface SentimentIndexSectionProps {
  defaultRegion?: "us" | "br";
}

export default function SentimentIndexSection({ defaultRegion = "us" }: SentimentIndexSectionProps = {}) {
  const [region, setRegion] = useState<"us" | "br">(defaultRegion);
  const [period, setPeriod] = useState("6m");
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { latest, previous, history, components, isLoading } = useSentimentIndex(region);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await supabase.functions.invoke("sync-sentiment-index");
      toast.success("Sincronização iniciada. Os dados serão atualizados em ~1 minuto.");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["sentiment-index"] });
        queryClient.invalidateQueries({ queryKey: ["sentiment-history"] });
        queryClient.invalidateQueries({ queryKey: ["sentiment-components"] });
        setSyncing(false);
      }, 60000);
    } catch {
      toast.error("Erro ao iniciar sincronização");
      setSyncing(false);
    }
  };

  const filteredHistory = useMemo(() => {
    if (!history.length) return [];
    const p = PERIODS.find((pp) => pp.key === period);
    if (!p || p.days === 0) return history;
    if (p.days === -1) {
      const year = new Date().getFullYear();
      return history.filter((h) => h.date >= `${year}-01-01`);
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - p.days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return history.filter((h) => h.date >= cutoffStr);
  }, [history, period]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[260px]" />
          <Skeleton className="h-[260px] lg:col-span-2" />
        </div>
        <Skeleton className="h-[340px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            Macrofy Sentiment Index
          </h2>
          <p className="text-sm text-muted-foreground">
            Indicador proprietário de sentimento de mercado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setRegion("us")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                region === "us"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              🇺🇸 EUA
            </button>
            <button
              onClick={() => setRegion("br")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                region === "br"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              🇧🇷 Brasil
            </button>
          </div>
          <Button variant="outline" size="icon" onClick={handleSync} disabled={syncing} title="Sincronizar dados">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!latest ? (
        /* Empty state */
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum dado disponível ainda. Clique em sincronizar para buscar os dados pela primeira vez.
            </p>
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Gauge + Component Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardContent className="pt-6 pb-4 flex items-center justify-center">
                <SentimentGauge
                  score={latest.headline_score}
                  regime={latest.regime_label}
                  previousScore={previous?.headline_score}
                  lastUpdate={(() => {
                    const [y, m, d] = latest.date.split("-");
                    return `${d}/${m}/${y}`;
                  })()}
                />
              </CardContent>
            </Card>
            <div className="lg:col-span-2">
              <SentimentComponentCards components={components} region={region} />
            </div>
          </div>

          {/* History Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">Histórico</CardTitle>
                <div className="flex gap-1 flex-wrap">
                  {PERIODS.map((p) => (
                    <Button
                      key={p.key}
                      variant={period === p.key ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setPeriod(p.key)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SentimentHistoryChart data={filteredHistory} />
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground max-w-3xl mx-auto">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              O <strong>Macrofy Sentiment Index</strong> é um indicador proprietário que combina múltiplos sinais de mercado
              — momentum, volatilidade, demanda por ativos seguros, crédito e amplitude — para medir o apetite e a aversão a
              risco. Valores baixos indicam <em>fear</em> (medo) e valores altos indicam maior <em>greed</em> (apetite por risco).
              A escala vai de 0 (Extreme Fear) a 100 (Extreme Greed).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
