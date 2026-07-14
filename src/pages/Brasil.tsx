import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import { IbovChartWidget } from "@/components/widgets/IbovChartWidget";
import { IbovMoversCard } from "@/components/markets/IbovMoversCard";
import { TradingViewEmbed } from "@/components/widgets/TradingViewEmbed";
import BrazilValuationSection from "@/components/markets/BrazilValuationSection";
import B3FlowsSection from "@/components/macro/B3FlowsSection";

import CountryMacroPanel from "@/components/macro/CountryMacroPanel";

import BrazilCurvePanel from "@/components/curves/BrazilCurvePanel";
import SentimentIndexSection from "@/components/sentiment/SentimentIndexSection";
import { BondsPanel } from "@/components/home/BondsPanel";

import { useSentimentIndex } from "@/hooks/useSentimentIndex";
import SentimentGauge from "@/components/sentiment/SentimentGauge";

const brasilHeatmapHtml = `<!-- TradingView Widget BEGIN -->
<div class="tradingview-widget-container">
  <div class="tradingview-widget-container__widget"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js" async>
  {
    "dataSource": "IBOV",
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

function ThermometerCard({ onClick }: { onClick: () => void }) {
  const { latest, previous, isLoading } = useSentimentIndex("br");

  return (
    <Card
      className="h-full cursor-pointer hover:border-primary/40 transition-colors group"
      onClick={onClick}
    >
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Termômetro de Mercado — Brasil</CardTitle>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </CardHeader>
      <CardContent className="pt-0 pb-3 flex items-center justify-center">
        {isLoading || !latest ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
            Carregando…
          </div>
        ) : (
          <div className="scale-90 origin-center">
            <SentimentGauge
              score={latest.headline_score}
              regime={latest.regime_label}
              previousScore={previous?.headline_score}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Brasil() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const currentTab = tab || "mercado";

  const handleTabChange = (value: string) => {
    navigate(`/brasil/${value}`);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <Flag className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">Brasil</h1>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-[480px]">
              <IbovChartWidget />
            </div>
            <div className="lg:col-span-1 h-[480px] flex flex-col gap-4">
              <ThermometerCard onClick={() => handleTabChange("sentiment")} />
              <div className="flex-1 min-h-0">
                <IbovMoversCard />
              </div>
            </div>
          </div>

          <TradingViewEmbed title="Heatmap IBOV" embedHtml={brasilHeatmapHtml} size="lg" />

          {/* Fluxos B3 — movidos do Macro Brasil */}
          <B3FlowsSection />

          <BrazilValuationSection />
        </TabsContent>

        {/* MACRO */}
        <TabsContent value="macro" className="space-y-4 mt-4">
          <CountryMacroPanel country="BR" />
        </TabsContent>

        {/* RENDA FIXA */}
        <TabsContent value="renda-fixa" className="space-y-4 mt-4">
          <BondsPanel show="br" />
          <BrazilCurvePanel />
        </TabsContent>

        {/* SENTIMENT */}
        <TabsContent value="sentiment" className="space-y-4 mt-4">
          <SentimentIndexSection defaultRegion="br" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
