import { Link } from 'react-router-dom';
import { Star, Clock, TrendingUp, FileText, BookOpen, ArrowRight, Info } from 'lucide-react';
import { useFavorites, useRecents } from '@/hooks/useUserData';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useReports } from '@/hooks/useReports';
import { useArticles } from '@/hooks/useArticles';
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
        icon: TrendingUp,
        to: `/recomendacoes/${rec.id}`,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      };
    }
  }

  if (itemType === 'report') {
    const report = reports?.find((r) => r.id === itemId);
    if (report) {
      return {
        title: report.title,
        subtitle: report.type,
        icon: FileText,
        to: `/relatorios/${report.id}`,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      };
    }
  }

  if (itemType === 'article') {
    const article = articles?.find((a) => a.id === itemId);
    if (article) {
      return {
        title: article.title,
        subtitle: `${article.read_time || 5} min`,
        icon: BookOpen,
        to: `/artigos/${article.id}`,
        color: 'text-gold',
        bgColor: 'bg-gold/10',
      };
    }
  }

  return null;
}

export function FavoritesRecents() {
  const { data: favorites = [], isLoading: favoritesLoading } = useFavorites();
  const { data: recents = [], isLoading: recentsLoading } = useRecents();
  const { data: recommendations = [] } = useRecommendations();
  const { data: reports = [] } = useReports();
  const { data: articles = [] } = useArticles();

  const favoriteItems = favorites
    .map((f) => ({
      ...f,
      details: getItemDetails(f.item_type, f.item_id, recommendations, reports, articles),
    }))
    .filter((f) => f.details !== null)
    .slice(0, 5);

  const recentItems = recents
    .map((r) => ({
      ...r,
      details: getItemDetails(r.item_type, r.item_id, recommendations, reports, articles),
    }))
    .filter((r) => r.details !== null)
    .slice(0, 5);

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Favoritos */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-gold" />
            <h3 className="font-medium text-foreground text-sm">Favoritos</h3>
          </div>
          <Link
            to="/favoritos"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {favoritesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : favoriteItems.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Info className="h-4 w-4 mx-auto mb-1 opacity-50" />
            <p>Nenhum favorito ainda</p>
          </div>
        ) : (
          <div className="space-y-1">
            {favoriteItems.map((item) => {
              const Icon = item.details!.icon;
              return (
                <Link
                  key={item.id}
                  to={item.details!.to}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0',
                      item.details!.bgColor
                    )}
                  >
                    <Icon className={cn('h-4 w-4', item.details!.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {item.details!.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.details!.subtitle}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recentes */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-foreground text-sm">Recentes</h3>
          </div>
          <Link
            to="/recentes"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Info className="h-4 w-4 mx-auto mb-1 opacity-50" />
            <p>Nenhum item recente</p>
          </div>
        ) : (
          <div className="space-y-1">
            {recentItems.map((item) => {
              const Icon = item.details!.icon;
              return (
                <Link
                  key={item.id}
                  to={item.details!.to}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0',
                      item.details!.bgColor
                    )}
                  >
                    <Icon className={cn('h-4 w-4', item.details!.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {item.details!.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.details!.subtitle}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
