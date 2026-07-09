import { useState, useMemo } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import MacroHeatmapTable from "@/components/macro/MacroHeatmapTable";
import MacroSidePanel from "@/components/macro/MacroSidePanel";
import MacroSummaryCards from "@/components/macro/MacroSummaryCards";
import MacroCountryCharts from "@/components/macro/MacroCountryCharts";
import FedWatchCard from "@/components/macro/FedWatchCard";
import CopomCard from "@/components/macro/CopomCard";
import BrazilHistoricalPEChart from "@/components/macro/BrazilHistoricalPEChart";
import { useMacroMetadata, useMacroData } from "@/hooks/useMacroData";

interface Props {
  country: "BR" | "US";
}

export default function CountryMacroPanel({ country }: Props) {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [period, setPeriod] = useState("12");
  const [category, setCategory] = useState("all");
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: metadata } = useMacroMetadata();
  const { data: heatmapData, isLoading, refetch } = useMacroData(country, parseInt(period));

  const categories = useMemo(() => {
    if (!metadata) return [];
    return [...new Set(metadata.filter((m) => m.country === country).map((m) => m.category))];
  }, [metadata, country]);

  const filteredData = useMemo(() => {
    if (!heatmapData) return [];
    if (category === "all") return heatmapData;
    return heatmapData.filter((d) => d.category === category);
  }, [heatmapData, category]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const fnName = country === "BR" ? "sync-macro-bcb" : "sync-macro-fred";
      const { error } = await supabase.functions.invoke(fnName);
      if (error) throw error;
      toast.success(`Dados ${country === "BR" ? "Brasil" : "EUA"} sincronizados com sucesso`);
      refetch();
    } catch (err: any) {
      toast.error(`Erro ao sincronizar: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncPE = async () => {
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
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <MacroSummaryCards country={country} data={heatmapData || []} />

      {/* Central bank scenario card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {country === "BR" ? <CopomCard /> : <FedWatchCard />}
      </div>

      {/* Market Charts */}
      <MacroCountryCharts country={country} />

      {/* Brazil-specific: historical P/E */}
      {country === "BR" && (
        <div className="space-y-2">
          {isAdmin && (
            <div className="flex items-center justify-end">
              <Button variant="outline" size="sm" onClick={handleSyncPE} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                Sincronizar P/L (brapi)
              </Button>
            </div>
          )}
          <BrazilHistoricalPEChart />
        </div>
      )}

      {/* Heatmap controls + table */}
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

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              Sincronizar {country === "BR" ? "Brasil" : "EUA"}
            </Button>
          )}
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
