import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MacroMetadata {
  id: string;
  country: string;
  category: string;
  indicator: string;
  source: string;
  series_code: string;
  unit: string;
  frequency: string;
  default_mode: string;
  polarity: string;
  sort_order: number;
  enabled: boolean;
  notes: string | null;
}

export interface MacroDataPoint {
  id: string;
  country: string;
  category: string;
  indicator: string;
  source: string;
  series_code: string;
  date: string;
  raw_value: number | null;
  display_value: string | null;
  mom_value: number | null;
  yoy_value: number | null;
  ma3_value: number | null;
  ma12_value: number | null;
  heat_score: number | null;
  polarity: string;
  unit: string | null;
  frequency: string;
}

export function useMacroMetadata() {
  return useQuery({
    queryKey: ['macro-metadata'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('macro_series_metadata')
        .select('*')
        .eq('enabled', true)
        .order('sort_order');
      if (error) throw error;
      return data as MacroMetadata[];
    },
  });
}

export function useMacroData(country: string, periodMonths: number) {
  return useQuery({
    queryKey: ['macro-heatmap-data', country, periodMonths],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - periodMonths - 13);
      const { data, error } = await (supabase as any)
        .from('macro_heatmap_data')
        .select('*')
        .eq('country', country)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });
      if (error) throw error;
      return data as MacroDataPoint[];
    },
  });
}

export function useMacroSeriesHistory(seriesCode: string | null, country: string) {
  return useQuery({
    queryKey: ['macro-series-history', seriesCode, country],
    enabled: !!seriesCode,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('macro_heatmap_data')
        .select('*')
        .eq('country', country)
        .eq('series_code', seriesCode)
        .order('date', { ascending: true });
      if (error) throw error;
      return data as MacroDataPoint[];
    },
  });
}
