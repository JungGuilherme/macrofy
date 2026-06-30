import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartConfig {
  title: string;
  embedHtml: string;
  type?: "tradingview" | "iframe";
  iframeSrc?: string;
}

function getThemeValues(theme: string) {
  if (theme === "light") {
    return {
      colorTheme: "light",
      backgroundColor: "#FFFFFF",
      widgetFontColor: "#131722",
      fontColor: "rgb(90, 90, 90)",
      gridLineColor: "rgba(0, 0, 0, 0.06)",
    };
  }
  return {
    colorTheme: "dark",
    backgroundColor: "#0F0F0F",
    widgetFontColor: "#DBDBDB",
    fontColor: "rgb(106, 109, 120)",
    gridLineColor: "rgba(242, 242, 242, 0.06)",
  };
}

const BR_CHARTS: ChartConfig[] = [
  {
    title: "IBOV no Ano",
    embedHtml: `<div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div><script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js" async>{"lineWidth":2,"lineType":0,"chartType":"area","fontColor":"rgb(106, 109, 120)","gridLineColor":"rgba(242, 242, 242, 0.06)","volumeUpColor":"rgba(34, 171, 148, 0.5)","volumeDownColor":"rgba(247, 82, 95, 0.5)","backgroundColor":"#0F0F0F","widgetFontColor":"#DBDBDB","upColor":"#22ab94","downColor":"#f7525f","borderUpColor":"#22ab94","borderDownColor":"#f7525f","wickUpColor":"#22ab94","wickDownColor":"#f7525f","colorTheme":"dark","isTransparent":false,"locale":"en","chartOnly":false,"scalePosition":"right","scaleMode":"Normal","fontFamily":"-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif","valuesTracking":"1","changeMode":"price-and-percent","symbols":[["INDEX:IBOV|YTD"],["AMEX:EWZ|YTD"],["BMFBOVESPA:IFIX|YTD"]],"dateRanges":["1d|1","1m|30","3m|60","12m|1D","60m|1W","ytd|1W","all|1M"],"fontSize":"10","headerFontSize":"medium","autosize":true,"width":"100%","height":"100%","noTimeScale":false,"hideDateRanges":false,"hideMarketStatus":false,"hideSymbolLogo":false}</script></div>`,
  },
  {
    title: "Dólar no Ano",
    embedHtml: `<div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div><script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js" async>{"lineWidth":2,"lineType":0,"chartType":"area","fontColor":"rgb(106, 109, 120)","gridLineColor":"rgba(242, 242, 242, 0.06)","volumeUpColor":"rgba(34, 171, 148, 0.5)","volumeDownColor":"rgba(247, 82, 95, 0.5)","backgroundColor":"#0F0F0F","widgetFontColor":"#DBDBDB","upColor":"#22ab94","downColor":"#f7525f","borderUpColor":"#22ab94","borderDownColor":"#f7525f","wickUpColor":"#22ab94","wickDownColor":"#f7525f","colorTheme":"dark","isTransparent":false,"locale":"en","chartOnly":false,"scalePosition":"right","scaleMode":"Normal","fontFamily":"-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif","valuesTracking":"1","changeMode":"price-and-percent","symbols":[["FX_IDC:USDBRL|YTD"]],"dateRanges":["1d|1","1m|30","3m|60","12m|1D","60m|1W","ytd|1W","all|1M"],"fontSize":"10","headerFontSize":"medium","autosize":true,"width":"100%","height":"100%","noTimeScale":false,"hideDateRanges":false,"hideMarketStatus":false,"hideSymbolLogo":false}</script></div>`,
  },
];

const US_CHARTS: ChartConfig[] = [
  {
    title: "Bolsas EUA",
    type: "iframe",
    iframeSrc: "https://app.koyfin.com/share/e9df7b988f/simple",
    embedHtml: "",
  },
  {
    title: "Treasuries & DXY",
    type: "iframe",
    iframeSrc: "https://app.koyfin.com/share/2e0198b23b/simple",
    embedHtml: "",
  },
];

function IframeWidget({ config }: { config: ChartConfig }) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card relative" style={{ height: 420 }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <span className="text-sm text-muted-foreground">Carregando…</span>
          </div>
        </div>
      )}
      <iframe
        src={config.iframeSrc}
        title={config.title}
        className="w-full h-full border-0"
        onLoad={() => setIsLoading(false)}
        allow="fullscreen"
      />
    </div>
  );
}

function ChartWidget({ config, theme }: { config: ChartConfig; theme: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tv = getThemeValues(theme);

  const adjustedHtml = config.embedHtml
    .replace(/"colorTheme":\s*"(light|dark)"/g, `"colorTheme":"${tv.colorTheme}"`)
    .replace(/"backgroundColor":\s*"[^"]*"/g, `"backgroundColor":"${tv.backgroundColor}"`)
    .replace(/"widgetFontColor":\s*"[^"]*"/g, `"widgetFontColor":"${tv.widgetFontColor}"`)
    .replace(/"fontColor":\s*"[^"]*"/g, `"fontColor":"${tv.fontColor}"`)
    .replace(/"gridLineColor":\s*"[^"]*"/g, `"gridLineColor":"${tv.gridLineColor}"`);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = "";
    setIsLoading(true);

    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.innerHTML = adjustedHtml;

    const scripts = Array.from(wrapper.querySelectorAll("script"));
    scripts.forEach((s) => s.remove());
    container.appendChild(wrapper);

    scripts.forEach((originalScript) => {
      const newScript = document.createElement("script");
      Array.from(originalScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (originalScript.src) {
        newScript.src = originalScript.src;
        newScript.async = true;
        newScript.textContent = originalScript.textContent || "";
        newScript.onload = () => setIsLoading(false);
        newScript.onerror = () => setIsLoading(false);
      } else {
        newScript.textContent = originalScript.textContent || "";
        setTimeout(() => setIsLoading(false), 600);
      }
      wrapper.appendChild(newScript);
    });

    const timeout = setTimeout(() => setIsLoading(false), 4000);
    return () => {
      clearTimeout(timeout);
      container.innerHTML = "";
    };
  }, [adjustedHtml]);

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card relative" style={{ height: 380 }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <span className="text-sm text-muted-foreground">Carregando…</span>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

interface Props {
  country: "BR" | "US";
}

export default function MacroCountryCharts({ country }: Props) {
  const { theme } = useTheme();
  const charts = country === "BR" ? BR_CHARTS : US_CHARTS;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {charts.map((chart) =>
        chart.type === "iframe" ? (
          <IframeWidget key={chart.title} config={chart} />
        ) : (
          <ChartWidget key={`${chart.title}-${theme}`} config={chart} theme={theme} />
        )
      )}
    </div>
  );
}
