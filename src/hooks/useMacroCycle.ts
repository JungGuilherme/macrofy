import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MacroCyclePoint {
  date: string;
  growth_composite: number | null;
  inflacao_implicita_1a: number | null;
  quadrante: string | null;
}

export function useMacroCycle(country: "BR" = "BR") {
  const historyQuery = useQuery({
    queryKey: ["macro-cycle-history", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("macro_cycle_history")
        .select("date, growth_composite, inflacao_implicita_1a, quadrante")
        .eq("country", country)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data || []) as MacroCyclePoint[];
    },
  });

  const history = historyQuery.data || [];
  const withGrowth = history.filter((p) => p.growth_composite != null);
  const latest = withGrowth[withGrowth.length - 1] || history[history.length - 1] || null;

  const trajectory = (() => {
    if (!latest) return [] as { label: string; point: MacroCyclePoint }[];
    const targets: { label: string; days: number }[] = [
      { label: "-1 Ano", days: 365 },
      { label: "-6 Meses", days: 182 },
      { label: "-3 Meses", days: 91 },
      { label: "-1 Mês", days: 30 },
      { label: "-1 Semana", days: 7 },
    ];
    const latestTime = new Date(latest.date).getTime();
    const picks = targets.map(({ label, days }) => {
      const targetTime = latestTime - days * 86400000;
      let best: MacroCyclePoint | null = null;
      let bestDiff = Infinity;
      for (const p of history) {
        const diff = Math.abs(new Date(p.date).getTime() - targetTime);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = p;
        }
      }
      return best ? { label, point: best } : null;
    });
    return [...picks.filter((p): p is { label: string; point: MacroCyclePoint } => !!p), { label: "Atual", point: latest }];
  })();

  return {
    history,
    latest,
    trajectory,
    isLoading: historyQuery.isLoading,
  };
}
