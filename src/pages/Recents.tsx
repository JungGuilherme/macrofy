import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { NoRecents } from '@/components/common/EmptyState';
import { useRecents } from '@/hooks/useUserData';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useReports } from '@/hooks/useReports';
import { useArticles } from '@/hooks/useArticles';
import { TrendingUp, FileText, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function getItemDetails(
  itemType: string,
  itemId: string,
  recommendations: any[],
  reports: any[],
  articles: any[]
) {
  if (itemType === 'recommendation') {
    const rec = recommendations?.find((r) => r.id === itemId);
    if (rec) {
      return {
        title: rec.title,
        subtitle: rec.product_code,
        description: rec.thesis,
        icon: TrendingUp,
        to: `/recomendacoes/${rec.id}`,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        type: 'Recomendação',
      };
    }
  }

  if (itemType === 'report') {
    const report = reports?.find((r) => r.id === itemId);
    if (report) {
      return {
        title: report.title,
        subtitle: report.type,
        description: report.summary,
        icon: FileText,
        to: `/relatorios/${report.id}`,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        type: 'Relatório',
      };
    }
  }

  if (itemType === 'article') {
    const article = articles?.find((a) => a.id === itemId);
    if (article) {
      return {
        title: article.title,
        subtitle: `${article.read_time || 5} min`,
        description: article.subtitle,
        icon: BookOpen,
        to: `/artigos/${article.id}`,
        color: 'text-gold',
        bgColor: 'bg-gold/10',
        type: 'Artigo',
      };
    }
  }

  return null;
}

export default function Recents() {
  const { data: recents = [], isLoading } = useRecents();
  const { data: recommendations = [] } = useRecommendations();
  const { data: reports = [] } = useReports();
  const { data: articles = [] } = useArticles();
  const navigate = useNavigate();

  const recentItems = recents
    .map((r) => ({
      ...r,
      details: getItemDetails(r.item_type, r.item_id, recommendations, reports, articles),
    }))
    .filter((r) => r.details !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recentes"
        subtitle="Itens visualizados recentemente"
        breadcrumbs={[{ label: 'Recentes' }]}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : recentItems.length === 0 ? (
        <NoRecents />
      ) : (
        <div className="space-y-3">
          {recentItems.map((item, index) => {
            const Icon = item.details!.icon;
            return (
              <div
                key={`${item.id}-${index}`}
                className="bg-card rounded-xl border p-4 flex items-start gap-4 group"
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                    item.details!.bgColor
                  )}
                >
                  <Icon className={cn('h-6 w-6', item.details!.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="chip chip-muted text-xs">{item.details!.type}</span>
                  </div>
                  <Link
                    to={item.details!.to}
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {item.details!.title}
                  </Link>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {item.details!.description}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={item.details!.to}>Abrir</Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
