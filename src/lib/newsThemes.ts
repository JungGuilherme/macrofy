export type NewsTheme =
  | 'macro' | 'brasil' | 'eua' | 'politica' | 'empresas'
  | 'juros' | 'inflacao' | 'fiscal' | 'internacional'
  | 'commodities' | 'mercados' | 'cripto' | 'outros';

export interface NewsThemeMeta {
  value: NewsTheme;
  label: string;
  /** Tailwind classes using semantic tokens for chip background + text */
  chipClass: string;
}

export const NEWS_THEMES: NewsThemeMeta[] = [
  { value: 'macro',         label: 'Macro',         chipClass: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'brasil',        label: 'Brasil',        chipClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { value: 'eua',           label: 'EUA',           chipClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { value: 'politica',      label: 'Política',      chipClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  { value: 'empresas',      label: 'Empresas',      chipClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
  { value: 'juros',         label: 'Juros',         chipClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { value: 'inflacao',      label: 'Inflação',      chipClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  { value: 'fiscal',        label: 'Fiscal',        chipClass: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20' },
  { value: 'internacional', label: 'Internacional', chipClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  { value: 'commodities',   label: 'Commodities',   chipClass: 'bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-500/20' },
  { value: 'mercados',      label: 'Mercados',      chipClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
  { value: 'cripto',        label: 'Cripto',        chipClass: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20' },
  { value: 'outros',        label: 'Outros',        chipClass: 'bg-muted text-muted-foreground border-border' },
];

export const NEWS_THEME_MAP: Record<NewsTheme, NewsThemeMeta> = NEWS_THEMES.reduce(
  (acc, t) => { acc[t.value] = t; return acc; },
  {} as Record<NewsTheme, NewsThemeMeta>,
);

export function themeLabel(t: string): string {
  return NEWS_THEME_MAP[t as NewsTheme]?.label ?? t;
}

export function themeChipClass(t: string): string {
  return NEWS_THEME_MAP[t as NewsTheme]?.chipClass ?? 'bg-muted text-muted-foreground border-border';
}
