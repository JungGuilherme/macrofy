import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type WalletCategory =
  | 'materiais_estrategicos'
  | 'asset_allocation'
  | 'carteiras_offshore'
  | 'carteiras_previdencia'
  | 'laminas';

export interface StrategicWallet {
  id: string;
  category: WalletCategory;
  label: string;
  pdf_url: string | null;
  sort_order: number;
  updated_at: string;
}

const missingTable = (e: any) =>
  e && (e.code === '42P01' || e.code === 'PGRST205' ||
    /does not exist|not find|schema cache/i.test(e.message ?? ''));

/** Table lives behind a manual SQL step (Lovable Cloud). */
export function useStrategicWallets() {
  return useQuery({
    queryKey: ['strategic-wallets'],
    queryFn: async () => {
      const res = await (supabase as any)
        .from('strategic_wallets')
        .select('*')
        .order('sort_order');
      if (res.error) {
        if (missingTable(res.error)) return { setupNeeded: true, wallets: [] as StrategicWallet[] };
        throw res.error;
      }
      return { setupNeeded: false, wallets: (res.data ?? []) as StrategicWallet[] };
    },
  });
}

export function useUpdateWalletLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await (supabase as any)
        .from('strategic_wallets')
        .update({ label })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategic-wallets'] });
      toast.success('Nome atualizado');
    },
    onError: (e: Error) => toast.error('Erro ao renomear', { description: e.message }),
  });
}

export function useUpdateWalletPdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pdf_url }: { id: string; pdf_url: string | null }) => {
      const { error } = await (supabase as any)
        .from('strategic_wallets')
        .update({ pdf_url, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategic-wallets'] });
      toast.success('PDF atualizado');
    },
    onError: (e: Error) => toast.error('Erro ao atualizar PDF', { description: e.message }),
  });
}
