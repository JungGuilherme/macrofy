import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AlertType = 'attention' | 'content' | 'event' | 'market';
export type TimeHint = 'hoje' | 'amanha' | 'semana';

export interface HouseAlert {
  id: string;
  title: string;
  type: AlertType;
  url: string | null;
  is_pinned: boolean;
  time_hint: TimeHint | null;
  is_active: boolean | null;
  expires_at: string | null;
  display_order: number;
  created_at: string;
}

export interface CreateHouseAlertInput {
  title: string;
  type: AlertType;
  url?: string;
  is_pinned?: boolean;
  time_hint?: TimeHint | null;
  is_active?: boolean;
  expires_at?: string | null;
  display_order?: number;
}

export interface UpdateHouseAlertInput extends Partial<CreateHouseAlertInput> {
  id: string;
}

// Fetch active, non-expired alerts for display
export function useHouseAlerts() {
  return useQuery({
    queryKey: ['house-alerts'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('house_alerts')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gte.${today}`)
        .order('is_pinned', { ascending: false })
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        type: item.type as AlertType,
        time_hint: item.time_hint as TimeHint | null,
      })) as HouseAlert[];
    },
  });
}

// Fetch all alerts for admin management
export function useAllHouseAlerts() {
  return useQuery({
    queryKey: ['house-alerts-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('house_alerts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        type: item.type as AlertType,
        time_hint: item.time_hint as TimeHint | null,
      })) as HouseAlert[];
    },
  });
}

export function useCreateHouseAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateHouseAlertInput) => {
      // Get max display_order to append new item at the end
      const { data: existing } = await supabase
        .from('house_alerts')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);
      
      const maxOrder = existing?.[0]?.display_order ?? 0;

      const { data, error } = await supabase
        .from('house_alerts')
        .insert({
          title: input.title,
          type: input.type,
          url: input.url || null,
          is_pinned: input.is_pinned || false,
          time_hint: input.time_hint || null,
          is_active: input.is_active ?? true,
          expires_at: input.expires_at || null,
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['house-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['house-alerts-all'] });
      toast.success('Alerta criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar alerta: ' + error.message);
    },
  });
}

export function useUpdateHouseAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateHouseAlertInput) => {
      const { id, ...updateData } = input;
      const { data, error } = await supabase
        .from('house_alerts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['house-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['house-alerts-all'] });
      toast.success('Alerta atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar alerta: ' + error.message);
    },
  });
}

export function useDeleteHouseAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('house_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['house-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['house-alerts-all'] });
      toast.success('Alerta excluído');
    },
    onError: (error) => {
      toast.error('Erro ao excluir alerta: ' + error.message);
    },
  });
}

export function useReorderHouseAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, direction, alerts }: { id: string; direction: 'up' | 'down'; alerts: HouseAlert[] }) => {
      const currentIndex = alerts.findIndex(a => a.id === id);
      if (currentIndex === -1) throw new Error('Alert not found');
      
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= alerts.length) return;

      const currentAlert = alerts[currentIndex];
      const targetAlert = alerts[targetIndex];

      // Swap display_order values
      const updates = [
        supabase.from('house_alerts').update({ display_order: targetAlert.display_order }).eq('id', currentAlert.id),
        supabase.from('house_alerts').update({ display_order: currentAlert.display_order }).eq('id', targetAlert.id),
      ];

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['house-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['house-alerts-all'] });
    },
    onError: (error) => {
      toast.error('Erro ao reordenar: ' + error.message);
    },
  });
}
