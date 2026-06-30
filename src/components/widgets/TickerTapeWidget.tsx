import { useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export function TickerTapeWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = "";

    // Determine theme color based on current theme
    const colorTheme = theme === "light" ? "light" : "dark";

    // Create wrapper div
    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.width = "100%";

    // Create widget container
    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    wrapper.appendChild(widgetDiv);

    // Create copyright div
    const copyrightDiv = document.createElement("div");
    copyrightDiv.className = "tradingview-widget-copyright";
    copyrightDiv.innerHTML = `<a href="https://www.tradingview.com/markets/" rel="noopener nofollow" target="_blank"><span class="blue-text">Markets today</span></a><span class="trademark"> by TradingView</span>`;
    wrapper.appendChild(copyrightDiv);

    // Create and configure script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-tickers.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
        { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
        { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
        { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
        { proName: "INDEX:IBOV", title: "IBOVESPA" },
        { proName: "BMFBOVESPA:IFIX", title: "IFIX" },
        { proName: "FX_IDC:USDBRL", title: "USD/BRL" },
        { proName: "AMEX:EWZ", title: "EWZ" },
        { proName: "BLACKBULL:BRENT", title: "Brent USD" }
      ],
      colorTheme: colorTheme,
      locale: "en",
      largeChartUrl: "",
      isTransparent: false,
      showSymbolLogo: true
    });

    wrapper.appendChild(script);
    container.appendChild(wrapper);

    return () => {
      container.innerHTML = "";
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ minHeight: "72px" }}
    />
  );
}
