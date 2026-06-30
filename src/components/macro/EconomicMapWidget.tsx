import { useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export default function EconomicMapWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme !== "light";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const el = document.createElement("tv-economic-map");
    el.setAttribute("metrics", "gdp,ur,gdg,intr,iryy");
    if (isDark) {
      el.setAttribute("colorTheme", "dark");
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://widgets.tradingview-widget.com/w/br/tv-economic-map.js";

    container.appendChild(script);
    container.appendChild(el);

    return () => {
      container.innerHTML = "";
    };
  }, [isDark]);

  return (
    <div className="bg-card rounded-xl border p-4 overflow-hidden">
      <div ref={containerRef} className="w-full min-h-[500px]" />
    </div>
  );
}
