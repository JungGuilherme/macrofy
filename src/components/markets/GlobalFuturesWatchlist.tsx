import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Star, ArrowUpDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface FuturesQuote {
  symbol: string;
  name: string;
  description: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

type SortMode = "default" | "top" | "bottom";

export function GlobalFuturesWatchlist() {
  const [quotes, setQuotes] = useState<FuturesQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("futures-favorites");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [sortMode, setSortMode] = useState<SortMode>("default");

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("futures-watchlist");
      if (error) throw error;
      if (data?.quotes) {
        setQuotes(data.quotes);
        setUpdatedAt(data.updatedAt);
      }
    } catch (err) {
      console.error("Failed to fetch futures:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleFavorite = (symbol: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      localStorage.setItem("futures-favorites", JSON.stringify([...next]));
      return next;
    });
  };

  const cycleSortMode = () => {
    setSortMode((prev) =>
      prev === "default" ? "top" : prev === "top" ? "bottom" : "default"
    );
  };

  const sortedQuotes = [...quotes].sort((a, b) => {
    const aFav = favorites.has(a.symbol) ? 0 : 1;
    const bFav = favorites.has(b.symbol) ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;
    if (sortMode === "top") return b.changePercent - a.changePercent;
    if (sortMode === "bottom") return a.changePercent - b.changePercent;
    return 0;
  });

  const formatPrice = (price: number, currency: string, symbol: string) => {
    if (symbol === "^TNX") return `${price.toFixed(3)}%`;
    if (currency === "BRL") return price.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (price > 10000) return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatChange = (change: number, symbol: string) => {
    if (symbol === "^TNX") return `${change >= 0 ? "+" : ""}${change.toFixed(3)}`;
    return `${change >= 0 ? "+" : ""}${change.toFixed(2)}`;
  };

  

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5 font-semibold">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            Índices Futuros
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={cycleSortMode}
            >
              <ArrowUpDown className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => { setLoading(true); fetchData(); }}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-2 py-1 px-2 border-b border-border/50 mb-0.5">
            <div className="shrink-0 w-3" />
            <div className="shrink-0 w-3" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate min-w-0 flex-1">Índice</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider tabular-nums shrink-0">Preço</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider tabular-nums shrink-0 w-14 text-right">Var.</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider tabular-nums shrink-0 w-12 text-right hidden sm:inline">Pts</span>
          </div>
          <div className="space-y-0.5">
            {sortedQuotes.map((q) => {
              const isPositive = q.changePercent > 0;
              const isNegative = q.changePercent < 0;
              const isFav = favorites.has(q.symbol);

              return (
                <Tooltip key={q.symbol}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors group">
                      <button
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(q.symbol);
                        }}
                      >
                        <Star
                          className={cn(
                            "h-3 w-3 transition-colors",
                            isFav
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30 group-hover:text-muted-foreground/60"
                          )}
                        />
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        {isPositive && <TrendingUp className="h-3 w-3 text-success" />}
                        {isNegative && <TrendingDown className="h-3 w-3 text-destructive" />}
                        {!isPositive && !isNegative && <Minus className="h-3 w-3 text-muted-foreground" />}
                      </div>

                      <span className="text-[11px] text-muted-foreground truncate min-w-0 flex-1">
                        {q.name}
                      </span>

                      <span className="text-[11px] font-semibold text-foreground tabular-nums shrink-0">
                        {formatPrice(q.price, q.currency, q.symbol)}
                      </span>

                      <span
                        className={cn(
                          "text-[11px] font-medium tabular-nums shrink-0 w-14 text-right",
                          isPositive && "text-success",
                          isNegative && "text-destructive",
                          !isPositive && !isNegative && "text-muted-foreground"
                        )}
                      >
                        {q.changePercent >= 0 ? "+" : ""}
                        {q.changePercent.toFixed(2)}%
                      </span>

                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-12 text-right hidden sm:inline">
                        ({formatChange(q.change, q.symbol)})
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    <p className="text-[11px]">{q.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{q.symbol}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        <p className="text-[9px] text-muted-foreground mt-2 text-right">
          Fonte: Yahoo Finance
        </p>
      </CardContent>
    </Card>
  );
}
