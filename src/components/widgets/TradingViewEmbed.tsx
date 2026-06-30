import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/contexts/ThemeContext";

interface TradingViewEmbedProps {
  title?: string;
  embedHtml: string;
  size?: "md" | "lg";
}

const sizeMap = {
  md: 420,
  lg: 720,
};

function getThemeColor(theme: string): "light" | "dark" {
  return theme === "light" ? "light" : "dark";
}

export function TradingViewEmbed({ title, embedHtml, size = "md" }: TradingViewEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();

  const height = sizeMap[size];

  // Adjust embed HTML theme based on current theme (handles both "colorTheme" and "theme")
  const themeValue = getThemeColor(theme);
  const adjustedEmbedHtml = embedHtml
    .replace(/"colorTheme":\s*"(light|dark)"/g, `"colorTheme": "${themeValue}"`)
    .replace(/"theme":\s*"(light|dark)"/g, `"theme": "${themeValue}"`)
    .replace(
      /"backgroundColor":\s*"#[0-9a-fA-F]{3,8}"/g,
      `"backgroundColor": "${themeValue === "dark" ? "#0a0a0a" : "#ffffff"}"`,
    );

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = "";

    if (!adjustedEmbedHtml || adjustedEmbedHtml.trim() === "") {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // 1) Wrapper onde o HTML inteiro vai viver
    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.innerHTML = adjustedEmbedHtml;

    // 2) Pega os scripts ANTES, remove do wrapper, e depois re-executa
    const scripts = Array.from(wrapper.querySelectorAll("script"));
    scripts.forEach((s) => s.remove());

    // 3) Coloca o HTML (sem scripts) dentro do container
    container.appendChild(wrapper);

    // 4) Recria scripts (IMPORTANTE: copiar src + textContent)
    scripts.forEach((originalScript) => {
      const newScript = document.createElement("script");

      Array.from(originalScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });

      // tradingview: precisa do src e do JSON dentro do script
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
  }, [adjustedEmbedHtml]);

  const isEmpty = !embedHtml || embedHtml.trim() === "";

  return (
    <Card className="w-full overflow-hidden">
      {title && (
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0 relative" style={{ height }}>
        {isLoading && !isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <span className="text-sm text-muted-foreground">Carregando widget…</span>
            </div>
          </div>
        )}
        {isEmpty ? (
          <div className="flex items-center justify-center h-full bg-muted/30">
            <span className="text-sm text-muted-foreground">Widget não configurado</span>
          </div>
        ) : (
          <div ref={containerRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
        )}
      </CardContent>
    </Card>
  );
}
