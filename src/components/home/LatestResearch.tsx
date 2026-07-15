import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReports } from '@/hooks/useReports';
import { useArticles } from '@/hooks/useArticles';
import { FileText, BookOpen, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  kind: 'relatorio' | 'artigo';
  title: string;
  subtitle: string | null;
  createdAt: string;
  to: string;
}

/** Latest published research (reports + articles) as a horizontal strip. */
export function LatestResearch() {
  const { data: reports = [] } = useReports();
  const { data: articles = [] } = useArticles();

  const items = useMemo<Item[]>(() => {
    const merged: Item[] = [
      ...reports
        .filter((r) => r.is_published !== false)
        .map((r) => ({
          id: r.id, kind: 'relatorio' as const, title: r.title,
          subtitle: r.summary ?? r.subtitle, createdAt: r.created_at,
          to: `/relatorios/${r.id}`,
        })),
      ...articles
        .filter((a) => a.is_published !== false)
        .map((a) => ({
          id: a.id, kind: 'artigo' as const, title: a.title,
          subtitle: a.subtitle, createdAt: a.created_at,
          to: `/artigos/${a.id}`,
        })),
    ];
    return merged
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [reports, articles]);

  if (items.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Últimos relatórios & análises
        </h3>
        <Link to="/relatorios" className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todos <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <Link
            key={`${item.kind}-${item.id}`}
            to={item.to}
            className="group rounded-lg border bg-background/40 p-3 transition-colors hover:border-primary/40 flex flex-col gap-1.5 min-h-[104px]"
          >
            <div className="flex items-center gap-1.5">
              {item.kind === 'relatorio'
                ? <FileText className="h-3.5 w-3.5 text-primary" />
                : <BookOpen className="h-3.5 w-3.5 text-gold" />}
              <span className={cn(
                'text-[10px] font-bold uppercase tracking-wider',
                item.kind === 'relatorio' ? 'text-primary' : 'text-gold'
              )}>
                {item.kind === 'relatorio' ? 'Relatório' : 'Análise'}
              </span>
            </div>
            <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {item.title}
            </p>
            <p className="text-[11px] text-muted-foreground mt-auto">
              {new Date(item.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
