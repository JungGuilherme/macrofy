import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BrazilCurvePanel from "@/components/curves/BrazilCurvePanel";
import USCurvePanel from "@/components/curves/USCurvePanel";
import NtnbFechamentoPanel from "@/components/curves/NtnbFechamentoPanel";
import { TradingViewEmbed } from "@/components/widgets/TradingViewEmbed";

const globalYieldsHtml = `<iframe width="100%" height="100%" src="https://app.koyfin.com/gyld/simple/?columns=checkboxBtn,35;name,160;ticker-string,90;lastPrice,100;chg1d_adj,100;chg1dPct_adj,100;chg1y_adj,100;chg1yPct_adj,100&activeGroupId=default&sortColumn=&order=desc" frameBorder="0"></iframe>`;

export default function TesouroCurvas() {
  const [activeTab, setActiveTab] = useState("brasil");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curvas de Juros"
        subtitle="Compare curvas de juros do Brasil, EUA e yields globais"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="brasil">🇧🇷 Brasil</TabsTrigger>
          <TabsTrigger value="eua">🇺🇸 EUA</TabsTrigger>
          <TabsTrigger value="global">🌐 Global</TabsTrigger>
          <TabsTrigger value="ntnb">📊 Fechamento NTN-B</TabsTrigger>
        </TabsList>

        <TabsContent value="brasil">
          <BrazilCurvePanel />
        </TabsContent>

        <TabsContent value="eua">
          <USCurvePanel />
        </TabsContent>

        <TabsContent value="global">
          <TradingViewEmbed
            title="Yields Globais — Renda Fixa"
            embedHtml={globalYieldsHtml}
            size="lg"
          />
        </TabsContent>

        <TabsContent value="ntnb">
          <NtnbFechamentoPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
