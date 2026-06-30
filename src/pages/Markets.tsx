import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradingViewEmbed } from "@/components/widgets/TradingViewEmbed";
import { HomeMarketCards } from "@/components/home/HomeMarketCards";
import { BarChart2 } from "lucide-react";

const globalWidgets = [
  {
    title: "Mercados Globais",
    size: "lg" as const,
    embedHtml: `<!-- TradingView Widget BEGIN -->
<div class="tradingview-widget-container">
  <div class="tradingview-widget-container__widget"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js" async>
  {
    "colorTheme": "light",
    "dateRange": "12M",
    "locale": "en",
    "tabs": [
      {
        "title": "Indices",
        "symbols": [
          {"s": "FOREXCOM:SPXUSD", "d": "S&P 500"},
          {"s": "INDEX:NKY", "d": "Japan 225"},
          {"s": "INDEX:DEU40", "d": "DAX"},
          {"s": "FOREXCOM:UKXGBP", "d": "FTSE 100"},
          {"s": "SSE:000001", "d": "Shanghai"}
        ]
      },
      {
        "title": "Futuros",
        "symbols": [
          {"s": "CME_MINI:ES1!", "d": "S&P 500"},
          {"s": "CME_MINI:NQ1!", "d": "Nasdaq"},
          {"s": "CBOT:YM1!", "d": "Dow Jones"},
          {"s": "CME:FDAX1!", "d": "DAX"}
        ]
      },
      {
        "title": "Commodities",
        "symbols": [
          {"s": "BLACKBULL:BRENT", "d": "Brent"},
          {"s": "CFI:WTI", "d": "WTI"},
          {"s": "TVC:GOLD", "d": "Ouro"},
          {"s": "TVC:SILVER", "d": "Prata"}
        ]
      },
      {
        "title": "Moedas",
        "symbols": [
          {"s": "FX:EURUSD", "d": "EUR/USD"},
          {"s": "FX:GBPUSD", "d": "GBP/USD"},
          {"s": "FX:USDJPY", "d": "USD/JPY"},
          {"s": "FX:USDCAD", "d": "USD/CAD"}
        ]
      }
    ],
    "width": "100%",
    "height": "100%"
  }
  </script>
</div>
<!-- TradingView Widget END -->
`, // COLE AQUI (GLOBAL_OVERVIEW)
  },
  {
    title: "Heatmap S&P 500",
    size: "lg" as const,
    embedHtml: `<!-- TradingView Widget BEGIN -->
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
<!-- TradingView Widget END -->
`, // COLE AQUI (GLOBAL_HEATMAP_SPX)
  },
  {
    title: "Panorama Global",
    size: "lg" as const,
    embedHtml: `<iframe width="100%" height="100%" src="https://app.koyfin.com/wei/simple/?columns=checkboxBtn,40;name,200;ticker-string,100;lastPrice,100;chg1dPct_adj,100;chg1wPct_adj,100;chg1mPct_adj,100;chg1yPct_adj,100;chgYTDPct_adj,100;low52w,100;high52w,100;performance,200&activeGroupId=region&sortColumn=&order=desc" frameBorder="0"></iframe>`,
  },
  {
    title: "Heatmap ETFs EUA",
    size: "lg" as const,
    embedHtml: `<!-- TradingView Widget BEGIN -->
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
<!-- TradingView Widget END -->
`, // COLE AQUI (GLOBAL_HEATMAP_ETF)
  },
];

const rendaFixaWidgets = [
  {
    title: "Yields Globais — Renda Fixa",
    size: "lg" as const,
    embedHtml: `<iframe width="100%" height="100%" src="https://app.koyfin.com/gyld/simple/?columns=checkboxBtn,35;name,160;ticker-string,90;lastPrice,100;chg1d_adj,100;chg1dPct_adj,100;chg1y_adj,100;chg1yPct_adj,100&activeGroupId=default&sortColumn=&order=desc" frameBorder="0"></iframe>`,
  },
];

const commoditiesWidgets = [
  {
    title: "Commodities — Visão Geral",
    size: "md" as const,
    embedHtml: `<iframe width="100%" height="100%" src="https://app.koyfin.com/share/e0273336d9/simple" frameBorder="0"></iframe>`,
  },
  {
    title: "Commodities — Tabela",
    size: "md" as const,
    embedHtml: `<iframe width="100%" height="100%" src="https://app.koyfin.com/cmty/simple/?columns=checkboxBtn,35;name,152;ticker-string,100;lastPrice,90;chg1dPct_adj,100;chg1mPct_adj,100;chg3mPct_adj,100;chgYTDPct_adj,100;chg1yPct_adj,100&activeGroupId=group&sortColumn=&order=desc" frameBorder="0"></iframe>`,
  },
];

const criptoWidgets = [
  {
    title: "Cripto — Visão Geral",
    size: "lg" as const,
    embedHtml: `<!-- TradingView Widget BEGIN -->
<div class="tradingview-widget-container">
  <div class="tradingview-widget-container__widget"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js" async>
  {
    "colorTheme": "light",
    "dateRange": "12M",
    "locale": "en",
    "tabs": [
      {
        "title": "Cripto",
        "symbols": [
          {"s": "BITSTAMP:BTCUSD", "d": "Bitcoin"},
          {"s": "BITSTAMP:ETHUSD", "d": "Ethereum"},
          {"s": "CRYPTOCAP:USDT", "d": "Tether"},
          {"s": "COINBASE:SOLUSD", "d": "Solana"},
          {"s": "COINBASE:DOGEUSD", "d": "Dogecoin"},
          {"s": "COINBASE:ADAUSD", "d": "Cardano"},
          {"s": "CRYPTO:BNBUSD", "d": "BNB"}
        ]
      }
    ],
    "width": "100%",
    "height": "100%"
  }
  </script>
</div>
<!-- TradingView Widget END -->
`, // COLE AQUI (CRIPTO_OVERVIEW)
  },
  {
    title: "Heatmap Cripto",
    size: "lg" as const,
    embedHtml: `<!-- TradingView Widget BEGIN -->
<div class="tradingview-widget-container">
  <div class="tradingview-widget-container__widget"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js" async>
  {
    "dataSource": "Crypto",
    "blockSize": "market_cap_calc",
    "blockColor": "change",
    "locale": "en",
    "colorTheme": "light",
    "width": "100%",
    "height": "100%"
  }
  </script>
</div>
<!-- TradingView Widget END -->
`, // COLE AQUI (CRIPTO_HEATMAP) - Use width:"100%" e height:"100%" no JSON do widget
  },
];

// =============================================================================

export default function Markets() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const currentTab = tab || "global";

  const handleTabChange = (value: string) => {
    navigate(`/mercados/${value}`);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <BarChart2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">Mercados</h1>
        <span className="text-xs text-muted-foreground">Panorama Global</span>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="cripto">Cripto</TabsTrigger>
          <TabsTrigger value="commodities">Commodities</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4 mt-4">
          <HomeMarketCards preset="global_indices" columns={6} />
          {/* Mercados Globais (investing) */}
          <TradingViewEmbed
            title={globalWidgets[0].title}
            embedHtml={globalWidgets[0].embedHtml}
            size={globalWidgets[0].size}
          />
          {/* Heatmap S&P 500 */}
          <TradingViewEmbed
            title={globalWidgets[1].title}
            embedHtml={globalWidgets[1].embedHtml}
            size={globalWidgets[1].size}
          />
          {/* Heatmap ETFs EUA */}
          <TradingViewEmbed
            title={globalWidgets[3].title}
            embedHtml={globalWidgets[3].embedHtml}
            size={globalWidgets[3].size}
          />
          {/* Panorama Global (koyfin) — movido para o final */}
          <TradingViewEmbed
            title={globalWidgets[2].title}
            embedHtml={globalWidgets[2].embedHtml}
            size={globalWidgets[2].size}
          />
        </TabsContent>

        <TabsContent value="cripto" className="space-y-4 mt-4">
          {criptoWidgets.map((widget, index) => (
            <TradingViewEmbed
              key={`cripto-${index}`}
              title={widget.title}
              embedHtml={widget.embedHtml}
              size={widget.size}
            />
          ))}
        </TabsContent>

        <TabsContent value="commodities" className="space-y-4 mt-4">
          {commoditiesWidgets.map((widget, index) => (
            <TradingViewEmbed
              key={`commodities-${index}`}
              title={widget.title}
              embedHtml={widget.embedHtml}
              size={widget.size}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
