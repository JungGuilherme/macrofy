import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface Recommendation {
  id: string;
  title: string;
  product_code: string | null;
  category: string | null;
  status: string | null;
  risk_level: string | null;
  profile_fit: string[] | null;
  tags: string[] | null;
  executive_summary: string | null;
  thesis: string | null;
  risks: string | null;
  client_explanation: string | null;
  is_published: boolean | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  file_url: string | null;
}

export interface RecommendationMaterial {
  id: string;
  recommendation_id: string;
  type: string;
  label: string;
  url: string;
  created_at: string;
}

export function useRecommendations(filters?: {
  category?: string;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['recommendations', filters],
    queryFn: async () => {
      let query = supabase
        .from('recommendations')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.category && filters.category !== 'todos') {
        query = query.eq('category', filters.category);
      }
      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,product_code.ilike.%${filters.search}%,thesis.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Recommendation[];
    },
  });
}

export function useRecommendation(id: string | undefined) {
  return useQuery({
    queryKey: ['recommendation', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Recommendation | null;
    },
    enabled: !!id,
  });
}

export function useRecommendationMaterials(recommendationId: string | undefined) {
  return useQuery({
    queryKey: ['recommendation-materials', recommendationId],
    queryFn: async () => {
      if (!recommendationId) return [];

      const { data, error } = await supabase
        .from('recommendation_materials')
        .select('*')
        .eq('recommendation_id', recommendationId);

      if (error) throw error;
      return data as RecommendationMaterial[];
    },
    enabled: !!recommendationId,
  });
}

export function useCreateRecommendation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (recommendation: Omit<Recommendation, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('recommendations')
        .insert({
          ...recommendation,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      toast.success('Recomendação criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar recomendação', { description: error.message });
    },
  });
}

export function useUpdateRecommendation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Recommendation> & { id: string }) => {
      const { data, error } = await supabase
        .from('recommendations')
        .update({
          ...updates,
          updated_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['recommendation', data.id] });
      toast.success('Recomendação atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar recomendação', { description: error.message });
    },
  });
}

export function useDeleteRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recommendations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      toast.success('Recomendação removida');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover recomendação', { description: error.message });
    },
  });
}
