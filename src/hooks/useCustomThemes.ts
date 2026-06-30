import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomTheme {
  id: string;
  slug: string;
  label: string;
  color_key: string;
  display_order: number;
  is_hidden: boolean;
  created_at: string;
}

/** Predefined color presets for custom themes (Tailwind tokens / hsl) */
export const CUSTOM_THEME_COLORS: { key: string; label: string; chipClass: string }[] = [
  { key: 'slate',     label: 'Cinza',     chipClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' },
  { key: 'red',       label: 'Vermelho',  chipClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  { key: 'orange',    label: 'Laranja',   chipClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  { key: 'amber',     label: 'Âmbar',     chipClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { key: 'green',     label: 'Verde',     chipClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { key: 'teal',      label: 'Azul-piscina', chipClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
  { key: 'blue',      label: 'Azul',      chipClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { key: 'indigo',    label: 'Índigo',    chipClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  { key: 'violet',    label: 'Violeta',   chipClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
  { key: 'fuchsia',   label: 'Magenta',   chipClass: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20' },
  { key: 'pink',      label: 'Rosa',      chipClass: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' },
];

export function customThemeChipClass(colorKey: string): string {
  return (
    CUSTOM_THEME_COLORS.find((c) => c.key === colorKey)?.chipClass ??
    'bg-muted text-muted-foreground border-border'
  );
}

export function slugifyTheme(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

const QK = ['news-custom-themes'];

export function useCustomThemes() {
  return useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_custom_themes' as any)
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return ((data as any[]) || []) as CustomTheme[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCustomTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label: string; color_key: string; display_order?: number }) => {
      const slug = `custom:${slugifyTheme(input.label)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase
        .from('news_custom_themes' as any)
        .insert({
          slug,
          label: input.label.trim(),
          color_key: input.color_key,
          display_order: input.display_order ?? 999,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useUpdateCustomTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Omit<CustomTheme, 'id' | 'slug' | 'created_at'>>) => {
      const { error } = await supabase
        .from('news_custom_themes' as any)
        .update(patch as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useDeleteCustomTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('news_custom_themes' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
