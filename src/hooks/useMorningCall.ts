import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MorningCall {
  id: string;
  title: string;
  content_html: string | null;
  video_url: string | null;
  published_date: string;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useMorningCall() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get today's morning call
  const { data: todaysMorningCall, isLoading } = useQuery({
    queryKey: ["morning-call", "latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("morning_calls")
        .select("*")
        .order("published_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as MorningCall | null;
    },
  });

  // Get all morning calls (for admin listing)
  const { data: allMorningCalls } = useQuery({
    queryKey: ["morning-calls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("morning_calls")
        .select("*")
        .order("published_date", { ascending: false });

      if (error) throw error;
      return data as MorningCall[];
    },
  });

  // Create or update morning call
  const saveMorningCall = useMutation({
    mutationFn: async ({
      id,
      title,
      content_html,
      video_url,
      published_date,
      is_published,
    }: {
      id?: string;
      title: string;
      content_html: string;
      video_url?: string;
      published_date: string;
      is_published: boolean;
    }) => {
      if (id) {
        const { data, error } = await supabase
          .from("morning_calls")
          .update({ title, content_html, video_url: video_url || null, published_date, is_published })
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("morning_calls")
          .insert({ title, content_html, video_url: video_url || null, published_date, is_published })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["morning-call"] });
      queryClient.invalidateQueries({ queryKey: ["morning-calls"] });
      toast({
        title: "Morning Call salvo",
        description: "O Morning Call foi salvo com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    todaysMorningCall,
    allMorningCalls,
    isLoading,
    saveMorningCall,
  };
}
