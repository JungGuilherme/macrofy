import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  tags: string[] | null;
  author: string | null;
  read_time: number | null;
  is_published: boolean | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  file_url: string | null;
}

export function useArticles(filters?: { search?: string }) {
  return useQuery({
    queryKey: ['articles', filters],
    queryFn: async () => {
      let query = supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,subtitle.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Article[];
    },
  });
}

export function useArticle(id: string | undefined) {
  return useQuery({
    queryKey: ['article', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Article | null;
    },
    enabled: !!id,
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (article: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('articles')
        .insert({
          ...article,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Artigo criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar artigo', { description: error.message });
    },
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Article> & { id: string }) => {
      const { data, error } = await supabase
        .from('articles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['article', data.id] });
      toast.success('Artigo atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar artigo', { description: error.message });
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Artigo removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover artigo', { description: error.message });
    },
  });
}
