import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SentimentIndex {
  date: string;
  headline_score: number;
  regime_label: string;
  valid_components_count: number;
}

export interface SentimentComponent {
  component_key: string;
  raw_value: number;
  normalized_score: number;
  date: string;
}

export function useSentimentIndex(region: "us" | "br") {
  const indexQuery = useQuery({
    queryKey: ["sentiment-index", region],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("macrofy_sentiment_index")
        .select("*")
        .eq("region", region)
        .order("date", { ascending: false })
        .limit(2);
      if (error) throw error;
      return (data || []) as SentimentIndex[];
    },
  });

  const historyQuery = useQuery({
    queryKey: ["sentiment-history", region],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("macrofy_sentiment_index")
        .select("date, headline_score, regime_label")
        .eq("region", region)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data || []) as SentimentIndex[];
    },
  });

  const componentsQuery = useQuery({
    queryKey: ["sentiment-components", region],
    queryFn: async () => {
      const { data: latest } = await (supabase as any)
        .from("macrofy_sentiment_index")
        .select("date")
        .eq("region", region)
        .order("date", { ascending: false })
        .limit(1);

      if (!latest?.[0]) return [];

      const { data, error } = await (supabase as any)
        .from("macrofy_sentiment_components")
        .select("*")
        .eq("region", region)
        .eq("date", latest[0].date);
      if (error) throw error;
      return (data || []) as SentimentComponent[];
    },
  });

  return {
    latest: indexQuery.data?.[0] || null,
    previous: indexQuery.data?.[1] || null,
    history: historyQuery.data || [],
    components: componentsQuery.data || [],
    isLoading: indexQuery.isLoading || historyQuery.isLoading || componentsQuery.isLoading,
  };
}
