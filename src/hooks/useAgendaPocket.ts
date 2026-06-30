import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface AgendaEconomica {
  id: string;
  event_date: string;
  event_time: string | null;
  country: string;
  title: string;
  created_at: string;
}

export interface AgendaResultado {
  id: string;
  event_date: string;
  company: string;
  ticker: string;
  country: string;
  event_time: string | null;
  created_at: string;
}

export interface AgendaDividendo {
  id: string;
  event_date: string;
  company: string;
  ticker: string;
  country: string;
  dividend_type: string;
  dividend_yield: number | null;
  ex_date: string | null;
  created_at: string;
}

// Row types for table editing (without id/created_at for new rows)
export interface EconomicaRow {
  id?: string;
  event_date: string;
  event_time: string;
  country: string;
  title: string;
}

export interface ResultadoRow {
  id?: string;
  event_date: string;
  company: string;
  ticker: string;
  country: string;
  event_time: string;
}

export interface DividendoRow {
  id?: string;
  event_date: string;
  company: string;
  ticker: string;
  country: string;
  dividend_type: string;
  dividend_yield: string;
  ex_date: string;
}

// Helper to get local date string
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to parse local date (avoid timezone issues)
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Parse DD/MM/YYYY to YYYY-MM-DD
export function parseBRDate(dateStr: string): string {
  if (!dateStr) return '';
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // DD/MM/YYYY format
  const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

// Format YYYY-MM-DD to DD/MM/YYYY
export function formatToBRDate(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

// Check if an item's time has passed (for today)
export function isTimePast(timeStr: string | null, dateStr: string): boolean {
  const todayStr = getLocalDateString();
  if (dateStr !== todayStr) return dateStr < todayStr;
  if (!timeStr) return false;
  
  // Handle BMO/AMC
  if (timeStr === 'BMO') return new Date().getHours() >= 10;
  if (timeStr === 'AMC') return new Date().getHours() >= 18;
  
  // Handle HH:MM format
  const match = timeStr.match(/^(\d{2}):(\d{2})/);
  if (!match) return false;
  
  const [, hours, minutes] = match;
  const now = new Date();
  const eventTime = new Date();
  eventTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  
  return now > eventTime;
}

// Fetch hooks
export function useAgendaEconomica(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['agenda_economica', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenda_economica')
        .select('*')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });
      
      if (error) throw error;
      return data as AgendaEconomica[];
    },
  });
}

export function useAgendaResultados(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['agenda_resultados', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenda_resultados')
        .select('*')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });
      
      if (error) throw error;
      return data as AgendaResultado[];
    },
  });
}

export function useAgendaDividendos(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['agenda_dividendos', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenda_dividendos')
        .select('*')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return data as AgendaDividendo[];
    },
  });
}

// Fetch ALL for editing (no date filter)
export function useAllAgendaEconomica() {
  return useQuery({
    queryKey: ['agenda_economica_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenda_economica')
        .select('*')
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });
      
      if (error) throw error;
      return data as AgendaEconomica[];
    },
  });
}

export function useAllAgendaResultados() {
  return useQuery({
    queryKey: ['agenda_resultados_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenda_resultados')
        .select('*')
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });
      
      if (error) throw error;
      return data as AgendaResultado[];
    },
  });
}

export function useAllAgendaDividendos() {
  return useQuery({
    queryKey: ['agenda_dividendos_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenda_dividendos')
        .select('*')
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return data as AgendaDividendo[];
    },
  });
}

// Mutation hooks for Economica
export function useCreateAgendaEconomica() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<AgendaEconomica, 'id' | 'created_at'>) => {
      const { data: result, error } = await supabase
        .from('agenda_economica')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda_economica'] });
      queryClient.invalidateQueries({ queryKey: ['agenda_economica_all'] });
      toast.success('Evento econômico criado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar evento: ' + error.message);
    },
  });
}

export function useDeleteAgendaEconomica() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agenda_economica')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda_economica'] });
      queryClient.invalidateQueries({ queryKey: ['agenda_economica_all'] });
      toast.success('Evento removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });
}

// Bulk save for Economica
export function useBulkSaveAgendaEconomica() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rows: EconomicaRow[]) => {
      const toInsert = rows.filter(r => !r.id && r.event_date && r.title);
      const toUpdate = rows.filter(r => r.id && r.event_date && r.title);
      
      // Insert new rows
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('agenda_economica')
          .insert(toInsert.map(r => ({
            event_date: r.event_date,
            event_time: r.event_time || null,
            country: r.country || 'BR',
            title: r.title,
          })));
        if (insertError) throw insertError;
      }
      
      // Update existing rows
      for (const row of toUpdate) {
        const { error: updateError } = await supabase
          .from('agenda_economica')
          .update({
            event_date: row.event_date,
            event_time: row.event_time || null,
            country: row.country || 'BR',
            title: row.title,
          })
          .eq('id', row.id!);
        if (updateError) throw updateError;
      }
      
      return { inserted: toInsert.length, updated: toUpdate.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['agenda_economica'] });
      queryClient.invalidateQueries({ queryKey: ['agenda_economica_all'] });
      toast.success(`Agenda salva: ${result.inserted} novos, ${result.updated} atualizados`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });
}

// Mutation hooks for Resultados
export function useCreateAgendaResultado() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<AgendaResultado, 'id' | 'created_at'>) => {
      const { data: result, error } = await supabase
        .from('agenda_resultados')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda_resultados'] });
      queryClient.invalidateQueries({ queryKey: ['agenda_resultados_all'] });
      toast.success('Resultado criado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar resultado: ' + error.message);
    },
  });
}

export function useDeleteAgendaResultado() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agenda_resultados')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda_resultados'] });
      queryClient.invalidateQueries({ queryKey: ['agenda_resultados_all'] });
      toast.success('Resultado removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });
}

// Bulk save for Resultados
export function useBulkSaveAgendaResultados() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rows: ResultadoRow[]) => {
      // Required: event_date + company (ticker, country, time are optional)
      const toInsert = rows.filter(r => !r.id && r.event_date && r.company);
      const toUpdate = rows.filter(r => r.id && r.event_date && r.company);
      
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('agenda_resultados')
          .insert(toInsert.map(r => ({
            event_date: r.event_date,
            company: r.company,
            ticker: r.ticker ? r.ticker.toUpperCase() : '',
            country: r.country || 'BR',
            event_time: r.event_time || null,
          })));
        if (insertError) throw insertError;
      }
      
      for (const row of toUpdate) {
        const { error: updateError } = await supabase
          .from('agenda_resultados')
          .update({
            event_date: row.event_date,
            company: row.company,
            ticker: row.ticker ? row.ticker.toUpperCase() : '',
            country: row.country || 'BR',
            event_time: row.event_time || null,
          })
          .eq('id', row.id!);
        if (updateError) throw updateError;
      }
      
      return { inserted: toInsert.length, updated: toUpdate.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['agenda_resultados'] });
      queryClient.invalidateQueries({ queryKey: ['agenda_resultados_all'] });
      toast.success(`Resultados salvos: ${result.inserted} novos, ${result.updated} atualizados`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });
}

// Mutation hooks for Dividendos
export function useCreateAgendaDividendo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<AgendaDividendo, 'id' | 'created_at'>) => {
      const { data: result, error } = await supabase
        .from('agenda_dividendos')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda_dividendos'] });
      queryClient.invalidateQueries({ queryKey: ['agenda_dividendos_all'] });
      toast.success('Dividendo criado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar dividendo: ' + error.message);
    },
  });
}

export function useDeleteAgendaDividendo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agenda_dividendos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda_dividendos'] });
      queryClient.invalidateQueries({ queryKey: ['agenda_dividendos_all'] });
      toast.success('Dividendo removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });
}

// Bulk save for Dividendos
export function useBulkSaveAgendaDividendos() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rows: DividendoRow[]) => {
      // Required: event_date + company (ticker, country, dy, type, ex_date are optional)
      const toInsert = rows.filter(r => !r.id && r.event_date && r.company);
      const toUpdate = rows.filter(r => r.id && r.event_date && r.company);
      
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('agenda_dividendos')
          .insert(toInsert.map(r => ({
            event_date: r.event_date,
            company: r.company,
            ticker: r.ticker ? r.ticker.toUpperCase() : '',
            country: r.country || 'BR',
            dividend_type: r.dividend_type || 'Dividendo',
            dividend_yield: r.dividend_yield ? parseFloat(r.dividend_yield) : null,
            ex_date: r.ex_date || null,
          })));
        if (insertError) throw insertError;
      }
      
      for (const row of toUpdate) {
        const { error: updateError } = await supabase
          .from('agenda_dividendos')
          .update({
            event_date: row.event_date,
            company: row.company,
            ticker: row.ticker ? row.ticker.toUpperCase() : '',
            country: row.country || 'BR',
            dividend_type: row.dividend_type || 'Dividendo',
            dividend_yield: row.dividend_yield ? parseFloat(row.dividend_yield) : null,
            ex_date: row.ex_date || null,
          })
          .eq('id', row.id!);
        if (updateError) throw updateError;
      }
      
      return { inserted: toInsert.length, updated: toUpdate.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['agenda_dividendos'] });
      queryClient.invalidateQueries({ queryKey: ['agenda_dividendos_all'] });
      toast.success(`Dividendos salvos: ${result.inserted} novos, ${result.updated} atualizados`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });
}
