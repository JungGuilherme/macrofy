import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { NoFavorites } from '@/components/common/EmptyState';
import { useFavorites, useRemoveFavorite } from '@/hooks/useUserData';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useReports } from '@/hooks/useReports';
import { useArticles } from '@/hooks/useArticles';
import { TrendingUp, FileText, BookOpen, Trash2 } from 'lucide-react';
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

export default function Favorites() {
  const { data: favorites = [], isLoading } = useFavorites();
  const removeFavorite = useRemoveFavorite();
  const { data: recommendations = [] } = useRecommendations();
  const { data: reports = [] } = useReports();
  const { data: articles = [] } = useArticles();
  const navigate = useNavigate();

  const favoriteItems = favorites
    .map((f) => ({
      ...f,
      details: getItemDetails(f.item_type, f.item_id, recommendations, reports, articles),
    }))
    .filter((f) => f.details !== null);

  const handleRemove = (itemType: string, itemId: string) => {
    removeFavorite.mutate({ itemType, itemId });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Favoritos"
        subtitle="Seus itens favoritados"
        breadcrumbs={[{ label: 'Favoritos' }]}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : favoriteItems.length === 0 ? (
        <NoFavorites onExplore={() => navigate('/recomendacoes')} />
      ) : (
        <div className="space-y-3">
          {favoriteItems.map((item) => {
            const Icon = item.details!.icon;
            return (
              <div
                key={item.id}
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
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemove(item.item_type, item.item_id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={item.details!.to}>Abrir</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
