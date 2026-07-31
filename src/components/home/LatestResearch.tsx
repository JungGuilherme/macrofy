import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReports } from '@/hooks/useReports';
import { useArticles } from '@/hooks/useArticles';
import { useRecommendations } from '@/hooks/useRecommendations';
import { FileText, BookOpen, ArrowRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  kind: 'relatorio' | 'artigo' | 'recomendacao';
  title: string;
  subtitle: string | null;
  createdAt: string;
  to: string;
}

const TABS = [
  { key: 'relatorios', label: 'Últimos relatórios', to: '/relatorios' },
  { key: 'recomendacoes', label: 'Recomendações', to: '/recomendacoes' },
] as const;

/** Latest published research (reports + articles, or recommendations) as a horizontal strip. */
export function LatestResearch() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('relatorios');
  const { data: reports = [] } = useReports();
  const { data: articles = [] } = useArticles();
  const { data: recommendations = [] } = useRecommendations();

  const reportItems = useMemo<Item[]>(() => {
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

  const recommendationItems = useMemo<Item[]>(() => {
    return recommendations
      .filter((r) => r.is_published !== false)
      .map((r) => ({
        id: r.id, kind: 'recomendacao' as const, title: r.title,
        subtitle: r.product_code, createdAt: r.created_at,
        to: `/recomendacoes/${r.id}`,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [recommendations]);

  const items = tab === 'relatorios' ? reportItems : recommendationItems;
  const activeTab = TABS.find((t) => t.key === tab)!;

  if (reportItems.length === 0 && recommendationItems.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider whitespace-nowrap rounded-md transition-colors border-b-2',
                tab === t.key
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link to={activeTab.to} className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todos <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nada por aqui ainda.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {items.map((item) => (
            <Link
              key={`${item.kind}-${item.id}`}
              to={item.to}
              className="group rounded-lg border bg-background/40 p-3 transition-colors hover:border-primary/40 flex flex-col gap-1.5 min-h-[104px]"
            >
              <div className="flex items-center gap-1.5">
                {item.kind === 'relatorio' && <FileText className="h-3.5 w-3.5 text-primary" />}
                {item.kind === 'artigo' && <BookOpen className="h-3.5 w-3.5 text-gold" />}
                {item.kind === 'recomendacao' && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                <span className={cn(
                  'text-[10px] font-bold uppercase tracking-wider',
                  item.kind === 'relatorio' ? 'text-primary' : item.kind === 'artigo' ? 'text-gold' : 'text-emerald-500'
                )}>
                  {item.kind === 'relatorio' ? 'Relatório' : item.kind === 'artigo' ? 'Análise' : 'Recomendação'}
                </span>
              </div>
              <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-auto">
                {item.subtitle ? `${item.subtitle} · ` : ''}
                {new Date(item.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
