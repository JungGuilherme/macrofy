import { Link } from 'react-router-dom';
import { TrendingUp, Star, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useToggleFavorite, useAddRecent } from '@/hooks/useUserData';
import { cn } from '@/lib/utils';

const statusLabels: Record<string, { label: string; color: string }> = {
  em_oferta: { label: 'Em Oferta', color: 'bg-gold/20 text-gold border-gold/30' },
  ativa: { label: 'Ativa', color: 'bg-green-500/20 text-green-600 border-green-500/30' },
  monitoramento: { label: 'Monitoramento', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
  encerrada: { label: 'Encerrada', color: 'bg-muted text-muted-foreground border-muted' },
};

export function RecommendationsList() {
  const { data: recommendations = [], isLoading } = useRecommendations();
  const { toggle: toggleFavorite, isFavorite } = useToggleFavorite();
  const addRecent = useAddRecent();

  // Filter to show active and em_oferta recommendations
  const activeRecommendations = recommendations
    .filter((r) => r.status === 'ativa' || r.status === 'em_oferta')
    .slice(0, 6);

  const handleClick = (id: string) => {
    addRecent.mutate({ itemType: 'recommendation', itemId: id });
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Recomendações Ativas
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Recomendações Ativas
        </h3>
        <Link
          to="/recomendacoes"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Ver todas <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {activeRecommendations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma recomendação ativa no momento</p>
          </div>
        ) : (
          activeRecommendations.map((rec) => {
            const statusInfo = statusLabels[rec.status || 'ativa'];
            const favorite = isFavorite('recommendation', rec.id);

            return (
              <div key={rec.id} className="p-4 hover:bg-muted/30 transition-colors group">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'chip text-xs border',
                          statusInfo.color
                        )}
                      >
                        {statusInfo.label}
                      </span>
                      {rec.status === 'em_oferta' && (
                        <Sparkles className="h-3.5 w-3.5 text-gold" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {rec.category}
                      </span>
                    </div>
                    <Link
                      to={`/recomendacoes/${rec.id}`}
                      onClick={() => handleClick(rec.id)}
                      className="font-medium text-foreground group-hover:text-primary transition-colors block"
                    >
                      {rec.title}
                      {rec.product_code && (
                        <span className="text-muted-foreground font-normal ml-2">
                          ({rec.product_code})
                        </span>
                      )}
                    </Link>
                    {rec.executive_summary && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {rec.executive_summary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleFavorite('recommendation', rec.id)}
                    >
                      <Star
                        className={cn(
                          'h-4 w-4',
                          favorite
                            ? 'fill-gold text-gold'
                            : 'text-muted-foreground'
                        )}
                      />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
