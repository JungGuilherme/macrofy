import { useEffect, useRef, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";

function IbovChartWidgetInner() {
  const container = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const tvTheme = theme === "light" ? "light" : "dark";
  const bg = tvTheme === "dark" ? "#0F0F0F" : "#ffffff";

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = `
      <div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>
      <div class="tradingview-widget-copyright"><a href="https://br.tradingview.com/symbols/BMFBOVESPA-IBOV/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a></div>
    `;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "D",
      locale: "br",
      save_image: true,
      style: "1",
      symbol: "BMFBOVESPA:IBOV",
      theme: tvTheme,
      timezone: "Etc/UTC",
      backgroundColor: bg,
      gridColor: "rgba(46, 46, 46, 0.06)",
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      studies: ["STD;SMA"],
      autosize: true,
    });
    container.current.appendChild(script);

    const node = container.current;
    return () => {
      if (node) node.innerHTML = "";
    };
  }, [tvTheme, bg]);

  return (
    <Card className="w-full h-full overflow-hidden flex flex-col">
      <CardHeader className="py-3 px-4 shrink-0">
        <CardTitle className="text-base font-medium">Ibovespa — Gráfico</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <div
          ref={container}
          className="tradingview-widget-container"
          style={{ height: "100%", width: "100%" }}
        />
      </CardContent>
    </Card>
  );
}

export const IbovChartWidget = memo(IbovChartWidgetInner);
