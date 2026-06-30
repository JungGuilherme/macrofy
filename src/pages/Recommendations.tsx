import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { NoResults } from '@/components/common/EmptyState';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { RecommendationForm } from '@/components/forms/RecommendationForm';
import {
  useRecommendations,
  useCreateRecommendation,
  useUpdateRecommendation,
  useDeleteRecommendation,
  Recommendation,
} from '@/hooks/useRecommendations';
import { useToggleFavorite, useAddRecent } from '@/hooks/useUserData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Grid3X3,
  List,
  Star,
  Copy,
  Plus,
  Sparkles,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  em_oferta: 'chip-accent',
  ativa: 'chip-primary',
  monitoramento: 'chip-warning',
  encerrada: 'chip-muted',
};

const statusLabels: Record<string, string> = {
  em_oferta: 'Em Oferta',
  ativa: 'Ativa',
  monitoramento: 'Monitoramento',
  encerrada: 'Encerrada',
};

interface RecommendationCardProps {
  rec: Recommendation;
  isAdmin: boolean;
  onEdit: (rec: Recommendation) => void;
  onDelete: (rec: Recommendation) => void;
}

function RecommendationCard({ rec, isAdmin, onEdit, onDelete }: RecommendationCardProps) {
  const { toggle: toggleFavorite, isFavorite } = useToggleFavorite();
  const addRecent = useAddRecent();
  const favorited = isFavorite('recommendation', rec.id);

  const handleCopyArgument = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (rec.client_explanation) {
      navigator.clipboard.writeText(rec.client_explanation);
      toast.success('Argumento copiado');
    }
  };

  return (
    <div className="content-card group relative">
      <Link
        to={`/recomendacoes/${rec.id}`}
        onClick={() => addRecent.mutate({ itemType: 'recommendation', itemId: rec.id })}
        className="block p-4"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1.5">
            <span className={cn('chip', statusColors[rec.status || 'ativa'])}>
              {statusLabels[rec.status || 'ativa']}
            </span>
            <span className="chip chip-muted">{rec.category}</span>
          </div>
        </div>

        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
          {rec.title}
          {rec.product_code && (
            <span className="text-sm text-muted-foreground font-mono ml-2">
              {rec.product_code}
            </span>
          )}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {rec.thesis}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex gap-1">
            {rec.tags?.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            {(rec as any).file_url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open((rec as any).file_url, '_blank');
                }}
              >
                <FileText className="h-4 w-4 text-primary" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite('recommendation', rec.id);
              }}
            >
              <Star
                className={cn(
                  'h-4 w-4',
                  favorited ? 'fill-gold text-gold' : 'text-muted-foreground'
                )}
              />
            </Button>
            {rec.client_explanation && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyArgument}
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </Link>

      {isAdmin && (
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(rec)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(rec)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export default function Recommendations() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const addRecent = useAddRecent();
  const isAdmin = role === 'admin';

  const [view, setView] = useState<'table' | 'cards'>('table');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<Recommendation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRec, setDeletingRec] = useState<Recommendation | null>(null);

  const { data: recommendations = [], isLoading } = useRecommendations({
    category: categoryFilter,
    status: statusFilter,
    search,
  });

  const createMutation = useCreateRecommendation();
  const updateMutation = useUpdateRecommendation();
  const deleteMutation = useDeleteRecommendation();

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('todos');
    setStatusFilter('todos');
  };

  const handleRowClick = (rec: Recommendation) => {
    addRecent.mutate({ itemType: 'recommendation', itemId: rec.id });
    navigate(`/recomendacoes/${rec.id}`);
  };

  const handleCreate = () => {
    setEditingRec(null);
    setFormOpen(true);
  };

  const handleEdit = (rec: Recommendation) => {
    setEditingRec(rec);
    setFormOpen(true);
  };

  const handleDelete = (rec: Recommendation) => {
    setDeletingRec(rec);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (editingRec) {
      await updateMutation.mutateAsync({ id: editingRec.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setFormOpen(false);
    setEditingRec(null);
  };

  const handleConfirmDelete = async () => {
    if (deletingRec) {
      await deleteMutation.mutateAsync(deletingRec.id);
      setDeleteDialogOpen(false);
      setDeletingRec(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recomendações & Ofertas"
        subtitle="Análises e recomendações da casa"
        breadcrumbs={[{ label: 'Recomendações' }]}
        actions={
          isAdmin && (
            <Button className="gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Nova Recomendação
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, ticker ou tese..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="FII">FII</SelectItem>
            <SelectItem value="Ação">Ação</SelectItem>
            <SelectItem value="Renda Fixa">Renda Fixa</SelectItem>
            <SelectItem value="Fundo">Fundo</SelectItem>
            <SelectItem value="Internacional">Internacional</SelectItem>
            <SelectItem value="Cripto">Cripto</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="em_oferta">Em Oferta</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="monitoramento">Monitoramento</SelectItem>
            <SelectItem value="encerrada">Encerrada</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1 ml-auto">
          <Button
            variant={view === 'table' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setView('table')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'cards' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setView('cards')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <NoResults query={search} onClear={clearFilters} />
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead className="hidden lg:table-cell">Tese</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recommendations.map((rec) => (
                <TableRow
                  key={rec.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(rec)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">{rec.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {rec.product_code}
                        </p>
                      </div>
                      {rec.status === 'em_oferta' && (
                        <Sparkles className="h-4 w-4 text-primary" />
                      )}
                      {(rec as any).file_url && (
                        <FileText className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="chip chip-muted">{rec.category}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cn('chip', statusColors[rec.status || 'ativa'])}>
                      {statusLabels[rec.status || 'ativa']}
                    </span>
                  </TableCell>
                  <TableCell className="capitalize">{rec.risk_level}</TableCell>
                  <TableCell className="hidden lg:table-cell max-w-[300px]">
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {rec.thesis}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (rec.client_explanation) {
                            navigator.clipboard.writeText(rec.client_explanation);
                            toast.success('Argumento copiado');
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(rec);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(rec);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Modal */}
      <RecommendationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        recommendation={editingRec}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
        title="Excluir recomendação"
        description={`Tem certeza que deseja excluir "${deletingRec?.title}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
