import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import MacroHeatmapTable from "@/components/macro/MacroHeatmapTable";
import MacroSidePanel from "@/components/macro/MacroSidePanel";
import MacroSummaryCards from "@/components/macro/MacroSummaryCards";
import MacroCountryCharts from "@/components/macro/MacroCountryCharts";
import MacroGlobalTable from "@/components/macro/MacroGlobalTable";
import EconomicMapWidget from "@/components/macro/EconomicMapWidget";
import FedWatchCard from "@/components/macro/FedWatchCard";
import CopomCard from "@/components/macro/CopomCard";
import BrazilHistoricalPEChart from "@/components/macro/BrazilHistoricalPEChart";
import B3FlowsSection from "@/components/macro/B3FlowsSection";
import { useMacroMetadata, useMacroData } from "@/hooks/useMacroData";

export default function MacroDashboard() {
  const { country: routeCountry } = useParams<{ country?: string }>();
  const country = routeCountry === "eua" ? "US" : routeCountry === "brasil" ? "BR" : null;

  const [period, setPeriod] = useState("12");
  const [category, setCategory] = useState("all");
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: metadata } = useMacroMetadata();
  const {
    data: heatmapData,
    isLoading,
    refetch,
  } = useMacroData(country || "BR", parseInt(period));

  const categories = useMemo(() => {
    if (!metadata || !country) return [];
    return [
      ...new Set(
        metadata.filter((m) => m.country === country).map((m) => m.category)
      ),
    ];
  }, [metadata, country]);

  const filteredData = useMemo(() => {
    if (!heatmapData) return [];
    if (category === "all") return heatmapData;
    return heatmapData.filter((d) => d.category === category);
  }, [heatmapData, category]);

  const handleSync = async () => {
    if (!country) return;
    setSyncing(true);
    try {
      const fnName = country === "BR" ? "sync-macro-bcb" : "sync-macro-fred";
      const { error } = await supabase.functions.invoke(fnName);
      if (error) throw error;
      toast.success(
        `Dados ${country === "BR" ? "Brasil" : "EUA"} sincronizados com sucesso`
      );
      refetch();
    } catch (err: any) {
      toast.error(`Erro ao sincronizar: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Global overview page
  if (!country) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Visão Global"
          subtitle="Monitor macroeconômico comparativo — principais economias"
        />
        <MacroGlobalTable />
        <EconomicMapWidget />
      </div>
    );
  }

  const countryLabel = country === "BR" ? "Brasil" : "Estados Unidos";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader
          title={`Macro ${countryLabel}`}
          subtitle={`Resumo executivo e heatmap — ${countryLabel}`}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
            />
            Sincronizar {country === "BR" ? "Brasil" : "EUA"}
          </Button>
        </div>
      </div>

      {/* 1. Summary Cards */}
      <MacroSummaryCards
        country={country as "BR" | "US"}
        data={heatmapData || []}
      />

      {/* 1.5 Copom (BR only) */}
      {country === "BR" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CopomCard />
        </div>
      )}

      {/* 1.5 FedWatch (US only) */}
      {country === "US" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FedWatchCard />
        </div>
      )}

      {/* 2. Market Charts */}
      <MacroCountryCharts country={country as "BR" | "US"} />

      {/* 2.5 Brazil-specific: P/L Histórico + Fluxos B3 */}
      {country === "BR" && (
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setSyncing(true);
                try {
                  const { error } = await supabase.functions.invoke("sync-brapi-pe");
                  if (error) throw error;
                  toast.success("Dados de P/L atualizados via brapi");
                } catch (err: any) {
                  toast.error(`Erro ao sincronizar P/L: ${err.message}`);
                } finally {
                  setSyncing(false);
                }
              }}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              Sincronizar P/L (brapi)
            </Button>
          </div>
          <BrazilHistoricalPEChart />
          <B3FlowsSection />
        </div>
      )}

      {/* 3. Heatmap Controls + Table */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Últimos 6m</SelectItem>
              <SelectItem value="12">Últimos 12m</SelectItem>
              <SelectItem value="24">Últimos 24m</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <MacroHeatmapTable
          data={filteredData}
          metadata={metadata?.filter((m) => m.country === country) || []}
          isLoading={isLoading}
          onRowClick={setSelectedSeries}
          period={parseInt(period)}
        />
      </div>

      <MacroSidePanel
        seriesCode={selectedSeries}
        country={country}
        metadata={metadata}
        onClose={() => setSelectedSeries(null)}
      />
    </div>
  );
}
