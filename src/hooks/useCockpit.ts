import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Re-export from dedicated hook
export { useHouseAlerts, type HouseAlert } from './useHouseAlerts';

export interface EconomicCalendarEvent {
  id: string;
  event_date: string;
  event_time: string | null;
  title: string;
  region: string | null;
  impact: string | null;
  notes: string | null;
  created_at: string;
}

export function useEconomicCalendar(daysAhead: number = 7) {
  return useQuery({
    queryKey: ['economic-calendar', daysAhead],
    queryFn: async () => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('economic_calendar')
        .select('*')
        .gte('event_date', today.toISOString().split('T')[0])
        .lte('event_date', futureDate.toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });

      if (error) throw error;
      return data as EconomicCalendarEvent[];
    },
  });
}

export function useDashboardEmbeds(scope: string) {
  return useQuery({
    queryKey: ['dashboard-embeds', scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_embeds')
        .select('*')
        .eq('scope', scope)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
  });
}
