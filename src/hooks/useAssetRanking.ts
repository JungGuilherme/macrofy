import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RankingAsset {
  id: string;
  name: string;
  short_name: string;
  color: string;
  sort_order: number;
  enabled: boolean;
}

export interface RankingReturn {
  id: string;
  asset_id: string;
  period: string;
  return_pct: number;
}

/** Tables live behind a manual SQL step (Lovable Cloud). 42P01 = missing. */
export function useAssetRanking() {
  return useQuery({
    queryKey: ['asset-ranking'],
    queryFn: async () => {
      const [assetsRes, returnsRes] = await Promise.all([
        (supabase as any).from('ranking_assets').select('*').eq('enabled', true).order('sort_order'),
        (supabase as any).from('ranking_returns').select('*'),
      ]);
      const missingTable = (e: any) =>
        e && (e.code === '42P01' || e.code === 'PGRST205' ||
          /does not exist|not find|schema cache/i.test(e.message ?? ''));
      if (assetsRes.error) {
        if (missingTable(assetsRes.error)) return { setupNeeded: true, assets: [], returns: [] };
        throw assetsRes.error;
      }
      if (returnsRes.error) {
        if (missingTable(returnsRes.error)) return { setupNeeded: true, assets: [], returns: [] };
        throw returnsRes.error;
      }
      return {
        setupNeeded: false,
        assets: (assetsRes.data ?? []) as RankingAsset[],
        returns: (returnsRes.data ?? []) as RankingReturn[],
      };
    },
  });
}

export function useUpsertReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { asset_id: string; period: string; return_pct: number }) => {
      const { error } = await (supabase as any)
        .from('ranking_returns')
        .upsert(row, { onConflict: 'asset_id,period' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asset-ranking'] }),
    onError: (e: Error) => toast.error('Erro ao salvar retorno', { description: e.message }),
  });
}

export function useDeleteReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ asset_id, period }: { asset_id: string; period: string }) => {
      const { error } = await (supabase as any)
        .from('ranking_returns')
        .delete()
        .eq('asset_id', asset_id)
        .eq('period', period);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asset-ranking'] }),
  });
}

export function useUpsertAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (asset: Partial<RankingAsset> & { name: string; short_name: string }) => {
      const { error } = await (supabase as any)
        .from('ranking_assets')
        .upsert(asset, { onConflict: 'name' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-ranking'] });
      toast.success('Ativo salvo');
    },
    onError: (e: Error) => toast.error('Erro ao salvar ativo', { description: e.message }),
  });
}
