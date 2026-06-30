import { Star, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeChipClass, themeLabel, type NewsTheme } from '@/lib/newsThemes';
import { Button } from '@/components/ui/button';
import type { AggregatedNewsRow } from '@/hooks/useRssFeeds';

interface NewsTerminalListProps {
  rows: AggregatedNewsRow[];
  isAdmin?: boolean;
  onToggleFeatured?: (row: AggregatedNewsRow) => void;
  onEditManual?: (row: AggregatedNewsRow) => void;
  onDeleteManual?: (row: AggregatedNewsRow) => void;
}

function formatTime(d: Date): { hhmm: string; full: string } {
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const hhmm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const full = d.toLocaleString('pt-BR');
  return { hhmm: isToday ? hhmm : date, full };
}

const GRID = 'grid grid-cols-[60px_24px_minmax(0,1fr)_140px_180px] gap-3';

export function NewsTerminalList({
  rows, isAdmin, onToggleFeatured, onEditManual, onDeleteManual,
}: NewsTerminalListProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma notícia encontrada com os filtros atuais.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className={cn(GRID, 'px-3 py-2 border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground')}>
        <div>Hora</div>
        <div></div>
        <div>Manchete</div>
        <div>Fonte</div>
        <div>Tema</div>
      </div>

      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const t = formatTime(row.publishedAt);
          return (
            <li
              key={row.id}
              className={cn(
                'group items-center text-xs transition-colors hover:bg-accent/40',
                GRID,
                'px-3 py-2',
                row.isFeatured && 'bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-l-amber-500',
              )}
            >
              {/* Time */}
              <time
                title={t.full}
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  row.isFeatured ? 'text-amber-700 dark:text-amber-300 font-semibold' : 'text-muted-foreground',
                )}
              >
                {t.hhmm}
              </time>

              {/* Featured star */}
              <div className="flex items-center justify-center">
                {row.isFeatured ? (
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                ) : (
                  <span className="block h-3.5 w-3.5" />
                )}
              </div>

              {/* Title (with inline admin actions on hover) */}
              <div className="flex items-center gap-2 min-w-0">
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 min-w-0 flex-1"
                >
                  <span
                    className={cn(
                      'truncate transition-colors',
                      row.isFeatured
                        ? 'text-amber-700 dark:text-amber-200 font-bold group-hover:text-amber-600 dark:group-hover:text-amber-100'
                        : 'font-medium text-foreground group-hover:text-primary',
                    )}
                  >
                    {row.isFeatured && '★ '}
                    {row.title}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
                {isAdmin && row.origin === 'manual' && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => onToggleFeatured?.(row)}
                      title={row.isFeatured ? 'Remover destaque' : 'Marcar como destaque'}
                    >
                      <Star className={cn('h-3 w-3', row.isFeatured && 'fill-primary text-primary')} />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => onEditManual?.(row)} title="Editar"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive"
                      onClick={() => onDeleteManual?.(row)} title="Excluir"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Source */}
              <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wide truncate">
                {row.source}
              </div>

              {/* Themes */}
              <div className="flex items-center gap-1 flex-wrap">
                {row.themes.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground/50 italic">—</span>
                ) : (
                  row.themes.slice(0, 3).map((th) => (
                    <span
                      key={th}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider border',
                        themeChipClass(th),
                      )}
                    >
                      {themeLabel(th)}
                    </span>
                  ))
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
