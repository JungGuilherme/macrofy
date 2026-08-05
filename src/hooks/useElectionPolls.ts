import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CandidateResult {
  name: string;
  party?: string;
  percentage: number;
}

export interface ElectionPoll {
  id: string;
  round: 1 | 2;
  institute: string;
  commissioned_by: string | null;
  survey_date: string;
  sample_size: number | null;
  margin_error: number | null;
  source_url: string | null;
  candidates: CandidateResult[];
  created_at: string;
}

const missingTable = (e: any) =>
  e && (e.code === '42P01' || e.code === 'PGRST205' ||
    /does not exist|not find|schema cache/i.test(e.message ?? ''));

export function useElectionPolls() {
  return useQuery({
    queryKey: ['election-polls'],
    queryFn: async () => {
      const res = await (supabase as any)
        .from('election_polls')
        .select('*')
        .order('survey_date', { ascending: false });
      if (res.error) {
        if (missingTable(res.error)) return { setupNeeded: true, polls: [] as ElectionPoll[] };
        throw res.error;
      }
      return { setupNeeded: false, polls: (res.data ?? []) as ElectionPoll[] };
    },
  });
}

export function useCreatePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (poll: Omit<ElectionPoll, 'id' | 'created_at'>) => {
      const { error } = await (supabase as any).from('election_polls').insert(poll);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['election-polls'] });
      toast.success('Pesquisa adicionada');
    },
    onError: (e: Error) => toast.error('Erro ao adicionar pesquisa', { description: e.message }),
  });
}

export function useDeletePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('election_polls').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['election-polls'] });
      toast.success('Pesquisa removida');
    },
    onError: (e: Error) => toast.error('Erro ao remover pesquisa', { description: e.message }),
  });
}
