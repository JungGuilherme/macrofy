import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Mover {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
}

interface MoversResponse {
  gainers: Mover[];
  losers: Mover[];
  updatedAt: string;
}

function MoverRow({ mover, positive }: { mover: Mover; positive: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="font-medium text-primary">{mover.ticker}</span>
      <div className="flex items-center gap-3 tabular-nums">
        <span
          className={cn(
            "font-semibold",
            positive ? "text-success" : "text-destructive",
          )}
        >
          {positive ? "+" : ""}
          {mover.changePercent.toFixed(2)}%
        </span>
        <span className="text-muted-foreground w-20 text-right">
          R$ {mover.price.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function IbovMoversCard() {
  const [data, setData] = useState<MoversResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data: res, error } = await supabase.functions.invoke<MoversResponse>(
          "ibov-movers",
        );
        if (error) throw error;
        if (active && res) setData(res);
      } catch (e) {
        console.error("Failed to load IBOV movers", e);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base font-medium">Ibovespa — Maiores Variações</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex-1 grid grid-cols-1 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-success uppercase mb-1">
            <TrendingUp className="h-3.5 w-3.5" /> Maiores Altas
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data?.gainers.map((m) => (
                <MoverRow key={m.ticker} mover={m} positive />
              ))}
              {data?.gainers.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">Sem dados</p>
              )}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive uppercase mb-1">
            <TrendingDown className="h-3.5 w-3.5" /> Maiores Baixas
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data?.losers.map((m) => (
                <MoverRow key={m.ticker} mover={m} positive={false} />
              ))}
              {data?.losers.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">Sem dados</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
