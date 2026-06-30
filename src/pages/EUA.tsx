import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flag } from "lucide-react";

import { TradingViewEmbed } from "@/components/widgets/TradingViewEmbed";
import MacroSummaryCards from "@/components/macro/MacroSummaryCards";
import MacroCountryCharts from "@/components/macro/MacroCountryCharts";
import MacroHeatmapTable from "@/components/macro/MacroHeatmapTable";
import FedWatchCard from "@/components/macro/FedWatchCard";
import { useMacroMetadata, useMacroData } from "@/hooks/useMacroData";

import USCurvePanel from "@/components/curves/USCurvePanel";
import SentimentIndexSection from "@/components/sentiment/SentimentIndexSection";

const koyfinUSHtml = `<iframe width="100%" height="100%" src="https://app.koyfin.com/wei/simple/?columns=checkboxBtn,40;name,200;ticker-string,100;lastPrice,100;chg1dPct_adj,100;chg1wPct_adj,100;chg1mPct_adj,100;chg1yPct_adj,100;chgYTDPct_adj,100;low52w,100;high52w,100;performance,200&activeGroupId=region&sortColumn=&order=desc" frameBorder="0"></iframe>`;

const heatmapSPXHtml = `<!-- TradingView Widget BEGIN -->
<div class="tradingview-widget-container">
  <div class="tradingview-widget-container__widget"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js" async>
  {
    "dataSource": "SPX500",
    "grouping": "sector",
    "blockSize": "market_cap_basic",
    "blockColor": "change",
    "locale": "en",
    "colorTheme": "light",
    "width": "100%",
    "height": "100%"
  }
  </script>
</div>
<!-- TradingView Widget END -->`;

const heatmapETFHtml = `<!-- TradingView Widget BEGIN -->
<div class="tradingview-widget-container">
  <div class="tradingview-widget-container__widget"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-etf-heatmap.js" async>
  {
    "dataSource": "AllUSEtf",
    "blockSize": "aum",
    "blockColor": "change",
    "grouping": "asset_class",
    "locale": "en",
    "colorTheme": "light",
    "width": "100%",
    "height": "100%"
  }
  </script>
</div>
<!-- TradingView Widget END -->`;

export default function EUA() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const currentTab = tab || "mercado";

  const handleTabChange = (value: string) => {
    navigate(`/eua/${value}`);
  };

  const { data: metadata } = useMacroMetadata();
  const { data: heatmapData, isLoading: heatLoading } = useMacroData("US", 12);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <Flag className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">Estados Unidos</h1>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="mercado">Mercado</TabsTrigger>
          <TabsTrigger value="macro">Macro</TabsTrigger>
          <TabsTrigger value="renda-fixa">Renda Fixa</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
        </TabsList>

        {/* MERCADO */}
        <TabsContent value="mercado" className="space-y-4 mt-4">
          <TradingViewEmbed title="Panorama EUA — Koyfin" embedHtml={koyfinUSHtml} size="lg" />
          <TradingViewEmbed title="Heatmap S&P 500" embedHtml={heatmapSPXHtml} size="lg" />
          <TradingViewEmbed title="Heatmap ETFs EUA" embedHtml={heatmapETFHtml} size="lg" />
        </TabsContent>

        {/* MACRO */}
        <TabsContent value="macro" className="space-y-4 mt-4">
          <MacroSummaryCards country="US" data={heatmapData || []} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FedWatchCard />
          </div>

          <MacroCountryCharts country="US" />

          <MacroHeatmapTable
            data={heatmapData || []}
            metadata={metadata?.filter((m) => m.country === "US") || []}
            isLoading={heatLoading}
            onRowClick={() => {}}
            period={12}
          />
        </TabsContent>

        {/* RENDA FIXA */}
        <TabsContent value="renda-fixa" className="space-y-4 mt-4">
          <USCurvePanel />
        </TabsContent>

        {/* SENTIMENT */}
        <TabsContent value="sentiment" className="space-y-4 mt-4">
          <SentimentIndexSection defaultRegion="us" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
