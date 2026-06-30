import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NEWS_THEMES, type NewsTheme } from '@/lib/newsThemes';

export interface ThemeSetting {
  theme: NewsTheme;
  label: string | null;
  is_hidden: boolean;
  display_order: number;
}

export interface ThemeSettingsMap {
  labels: Partial<Record<NewsTheme, string>>;
  hidden: Partial<Record<NewsTheme, boolean>>;
  order: Partial<Record<NewsTheme, number>>;
}

const QK = ['news-theme-labels'];

export function useThemeLabels() {
  return useQuery({
    queryKey: QK,
    queryFn: async (): Promise<ThemeSettingsMap> => {
      const { data, error } = await supabase
        .from('news_theme_labels' as any)
        .select('theme, label, is_hidden, display_order');
      if (error) throw error;
      const labels: Partial<Record<NewsTheme, string>> = {};
      const hidden: Partial<Record<NewsTheme, boolean>> = {};
      const order: Partial<Record<NewsTheme, number>> = {};
      for (const row of (data as any[]) || []) {
        const t = row.theme as NewsTheme;
        if (row.label) labels[t] = row.label;
        if (row.is_hidden) hidden[t] = true;
        if (typeof row.display_order === 'number') order[t] = row.display_order;
      }
      return { labels, hidden, order };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Resolve label using overrides falling back to default catalog. */
export function resolveLabel(
  theme: NewsTheme,
  settings: ThemeSettingsMap | undefined,
): string {
  return settings?.labels?.[theme] ?? NEWS_THEMES.find((t) => t.value === theme)?.label ?? theme;
}

/** Returns themes sorted by display_order (custom first), with hidden filtered out (optional). */
export function getOrderedThemes(
  settings: ThemeSettingsMap | undefined,
  includeHidden = false,
): NewsTheme[] {
  const orderMap = settings?.order ?? {};
  const hiddenMap = settings?.hidden ?? {};
  const list = NEWS_THEMES.map((t) => t.value)
    .filter((t) => includeHidden || !hiddenMap[t]);
  return list.sort((a, b) => {
    const oa = orderMap[a] ?? NEWS_THEMES.findIndex((t) => t.value === a);
    const ob = orderMap[b] ?? NEWS_THEMES.findIndex((t) => t.value === b);
    return oa - ob;
  });
}

export function useUpsertThemeLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ theme, label }: { theme: NewsTheme; label: string }) => {
      const { error } = await supabase
        .from('news_theme_labels' as any)
        .upsert({ theme, label, updated_at: new Date().toISOString() } as any, { onConflict: 'theme' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useResetThemeLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (theme: NewsTheme) => {
      // Clear label but keep hidden/order settings
      const { error } = await supabase
        .from('news_theme_labels' as any)
        .upsert({ theme, label: null, updated_at: new Date().toISOString() } as any, { onConflict: 'theme' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useSetThemeHidden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ theme, hidden }: { theme: NewsTheme; hidden: boolean }) => {
      const { error } = await supabase
        .from('news_theme_labels' as any)
        .upsert({ theme, is_hidden: hidden, updated_at: new Date().toISOString() } as any, { onConflict: 'theme' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useSetThemeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { theme: NewsTheme; display_order: number }[]) => {
      const rows = updates.map((u) => ({
        theme: u.theme,
        display_order: u.display_order,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('news_theme_labels' as any)
        .upsert(rows as any, { onConflict: 'theme' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
