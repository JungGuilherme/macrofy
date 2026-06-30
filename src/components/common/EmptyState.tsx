import { LucideIcon, FileQuestion, Star, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function NoFavorites({ onExplore }: { onExplore?: () => void }) {
  return (
    <EmptyState
      icon={Star}
      title="Nenhum favorito ainda"
      description="Marque recomendações, relatórios e artigos como favoritos para acessá-los rapidamente."
      action={onExplore ? { label: 'Explorar conteúdos', onClick: onExplore } : undefined}
    />
  );
}

export function NoRecents() {
  return (
    <EmptyState
      icon={Clock}
      title="Nenhum item recente"
      description="Os itens que você visualizar aparecerão aqui para acesso rápido."
    />
  );
}

export function NoResults({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="Nenhum resultado encontrado"
      description={
        query
          ? `Não encontramos resultados para "${query}". Tente ajustar os filtros ou termos de busca.`
          : 'Tente ajustar os filtros ou termos de busca.'
      }
      action={onClear ? { label: 'Limpar filtros', onClick: onClear } : undefined}
    />
  );
}
