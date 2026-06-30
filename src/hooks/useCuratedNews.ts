import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { NewsTheme } from '@/lib/newsThemes';

export interface CuratedNews {
  id: string;
  title: string;
  external_url: string;
  source: string | null;
  published_date: string;
  published_at: string;
  is_active: boolean;
  is_featured: boolean;
  themes: NewsTheme[];
  summary: string | null;
  image_url: string | null;
  created_at: string;
  created_by: string | null;
  content_html: string | null;
}

export type CuratedNewsInput = {
  title: string;
  external_url: string;
  source?: string | null;
  summary?: string | null;
  image_url?: string | null;
  themes?: NewsTheme[];
  is_featured?: boolean;
  is_active?: boolean;
  published_at?: string;
  content_html?: string | null;
};

export function useCuratedNews() {
  return useQuery({
    queryKey: ['curated-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curated_news')
        .select('*')
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      return (data as any[]).map((n) => ({
        ...n,
        themes: (n.themes || []) as NewsTheme[],
        is_featured: !!n.is_featured,
      })) as CuratedNews[];
    },
  });
}

export function useCuratedNewsById(id: string | undefined) {
  return useQuery({
    queryKey: ['curated-news', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('curated_news')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as CuratedNews | null;
    },
    enabled: !!id,
  });
}

export function useCreateCuratedNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (news: CuratedNewsInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const payload: any = {
        title: news.title,
        external_url: news.external_url,
        source: news.source ?? null,
        summary: news.summary ?? null,
        image_url: news.image_url ?? null,
        themes: news.themes ?? [],
        is_featured: news.is_featured ?? false,
        is_active: news.is_active ?? true,
        content_html: news.content_html ?? null,
        published_at: news.published_at ?? new Date().toISOString(),
        created_by: userData.user?.id,
      };
      const { data, error } = await supabase
        .from('curated_news')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curated-news'] });
      toast.success('Notícia criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating news:', error);
      toast.error('Erro ao criar notícia');
    },
  });
}

export function useUpdateCuratedNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...news }: Partial<CuratedNews> & { id: string }) => {
      const { data, error } = await supabase
        .from('curated_news')
        .update(news as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['curated-news'] });
      queryClient.invalidateQueries({ queryKey: ['curated-news', data.id] });
      toast.success('Notícia atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Error updating news:', error);
      toast.error('Erro ao atualizar notícia');
    },
  });
}

export function useDeleteCuratedNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('curated_news')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curated-news'] });
      toast.success('Notícia excluída com sucesso');
    },
    onError: (error) => {
      console.error('Error deleting news:', error);
      toast.error('Erro ao excluir notícia');
    },
  });
}

/** Toggle the featured flag for a curated news item */
export function useToggleFeaturedNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase
        .from('curated_news')
        .update({ is_featured })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curated-news'] });
    },
  });
}
