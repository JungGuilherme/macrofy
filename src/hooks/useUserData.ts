import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface Favorite {
  id: string;
  user_id: string;
  item_type: 'recommendation' | 'report' | 'article';
  item_id: string;
  created_at: string;
}

export interface Recent {
  id: string;
  user_id: string;
  item_type: 'recommendation' | 'report' | 'article';
  item_id: string;
  last_opened_at: string;
}

export interface InternalNote {
  id: string;
  user_id: string;
  recommendation_id: string;
  note: string;
  created_at: string;
}

// Favorites hooks
export function useFavorites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Favorite[];
    },
    enabled: !!user,
  });
}

export function useIsFavorite(itemType: string, itemId: string) {
  const { data: favorites } = useFavorites();
  return favorites?.some((f) => f.item_type === itemType && f.item_id === itemId) ?? false;
}

export function useAddFavorite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ itemType, itemId }: { itemType: string; itemId: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          item_type: itemType,
          item_id: itemId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Adicionado aos favoritos');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar favorito', { description: error.message });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ itemType, itemId }: { itemType: string; itemId: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', itemType)
        .eq('item_id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Removido dos favoritos');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover favorito', { description: error.message });
    },
  });
}

export function useToggleFavorite() {
  const { data: favorites } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  return {
    toggle: (itemType: string, itemId: string) => {
      const isFavorite = favorites?.some(
        (f) => f.item_type === itemType && f.item_id === itemId
      );

      if (isFavorite) {
        removeFavorite.mutate({ itemType, itemId });
      } else {
        addFavorite.mutate({ itemType, itemId });
      }
    },
    isFavorite: (itemType: string, itemId: string) =>
      favorites?.some((f) => f.item_type === itemType && f.item_id === itemId) ?? false,
  };
}

// Recents hooks
export function useRecents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recents', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('recents')
        .select('*')
        .eq('user_id', user.id)
        .order('last_opened_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Recent[];
    },
    enabled: !!user,
  });
}

export function useAddRecent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ itemType, itemId }: { itemType: string; itemId: string }) => {
      if (!user) throw new Error('User not authenticated');

      // First try to update existing record
      const { data: existing } = await supabase
        .from('recents')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_type', itemType)
        .eq('item_id', itemId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('recents')
          .update({ last_opened_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Otherwise insert new record
      const { data, error } = await supabase
        .from('recents')
        .insert({
          user_id: user.id,
          item_type: itemType,
          item_id: itemId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recents'] });
    },
  });
}

// Internal notes hooks
export function useInternalNotes(recommendationId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['internal-notes', recommendationId, user?.id],
    queryFn: async () => {
      if (!user || !recommendationId) return [];

      const { data, error } = await supabase
        .from('internal_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('recommendation_id', recommendationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InternalNote[];
    },
    enabled: !!user && !!recommendationId,
  });
}

export function useAddInternalNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ recommendationId, note }: { recommendationId: string; note: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('internal_notes')
        .insert({
          user_id: user.id,
          recommendation_id: recommendationId,
          note,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['internal-notes', data.recommendation_id] });
      toast.success('Nota salva');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar nota', { description: error.message });
    },
  });
}

export function useDeleteInternalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from('internal_notes').delete().eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-notes'] });
      toast.success('Nota removida');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover nota', { description: error.message });
    },
  });
}
