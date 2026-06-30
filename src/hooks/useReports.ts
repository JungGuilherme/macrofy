import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

export interface MaterialItem {
  label: string;
  url: string;
  type: string;
}

export interface Report {
  id: string;
  title: string;
  subtitle: string | null;
  type: string | null;
  theme: string | null;
  author: string | null;
  summary: string | null;
  tags: string[] | null;
  pdf_url: string | null;
  external_url: string | null;
  content_html: string | null;
  materials: MaterialItem[] | null;
  is_published: boolean | null;
  created_by: string | null;
  created_at: string;
}

// Helper to parse materials from Json
function parseMaterials(materials: Json | null): MaterialItem[] | null {
  if (!materials || !Array.isArray(materials)) return null;
  return materials.map((m: any) => ({
    label: m.label || '',
    url: m.url || '',
    type: m.type || 'link',
  }));
}

// Helper to convert Report to DB format
function toDbFormat(report: Partial<Report>): Record<string, any> {
  const { materials, ...rest } = report;
  return {
    ...rest,
    materials: materials ? JSON.stringify(materials) : null,
  };
}

export function useReports(filters?: {
  type?: string;
  theme?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['reports', filters],
    queryFn: async () => {
      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.type && filters.type !== 'todos') {
        query = query.eq('type', filters.type);
      }
      if (filters?.theme && filters.theme !== 'todos') {
        query = query.eq('theme', filters.theme);
      }
      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,summary.ilike.%${filters.search}%,author.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        materials: parseMaterials(r.materials),
      })) as Report[];
    },
  });
}

export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        materials: parseMaterials(data.materials),
      } as Report;
    },
    enabled: !!id,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (report: Omit<Report, 'id' | 'created_at'>) => {
      const { materials, ...rest } = report;
      const { data, error } = await supabase
        .from('reports')
        .insert({
          ...rest,
          materials: materials as unknown as Json,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Relatório criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar relatório', { description: error.message });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, materials, ...updates }: Partial<Report> & { id: string }) => {
      const { data, error } = await supabase
        .from('reports')
        .update({
          ...updates,
          materials: materials as unknown as Json,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['report', data.id] });
      toast.success('Relatório atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar relatório', { description: error.message });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Relatório removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover relatório', { description: error.message });
    },
  });
}
