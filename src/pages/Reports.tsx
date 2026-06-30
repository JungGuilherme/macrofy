import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { NoResults } from '@/components/common/EmptyState';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { ReportForm } from '@/components/forms/ReportForm';
import {
  useReports,
  useCreateReport,
  useUpdateReport,
  useDeleteReport,
  Report,
} from '@/hooks/useReports';
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
  Download,
  FileText,
  ArrowRight,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const typeLabels: Record<string, string> = {
  carta_mensal: 'Carta Mensal',
  relatorio: 'Relatório',
  morning_call: 'Morning Call',
  nota: 'Nota',
};

const typeColors: Record<string, string> = {
  carta_mensal: 'chip-primary',
  relatorio: 'chip-accent',
  morning_call: 'bg-navy/10 text-navy',
  nota: 'chip-muted',
};

interface ReportCardProps {
  report: Report;
  isAdmin: boolean;
  onEdit: (report: Report) => void;
  onDelete: (report: Report) => void;
}

function ReportCard({ report, isAdmin, onEdit, onDelete }: ReportCardProps) {
  const { toggle: toggleFavorite, isFavorite } = useToggleFavorite();
  const addRecent = useAddRecent();
  const favorited = isFavorite('report', report.id);

  return (
    <div className="content-card group relative">
      <Link
        to={`/relatorios/${report.id}`}
        onClick={() => addRecent.mutate({ itemType: 'report', itemId: report.id })}
        className="block p-4"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1.5">
            <span className={cn('chip', typeColors[report.type || 'relatorio'])}>
              {typeLabels[report.type || 'relatorio']}
            </span>
            {report.theme && (
              <span className="chip chip-muted">{report.theme}</span>
            )}
            {!(report.is_published ?? true) && (
              <span className="chip chip-warning">Rascunho</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite('report', report.id);
            }}
          >
            <Star
              className={cn(
                'h-4 w-4',
                favorited ? 'fill-gold text-gold' : 'text-muted-foreground'
              )}
            />
          </Button>
        </div>

        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
          {report.title}
        </h3>
        {(report as any).subtitle && (
          <p className="text-sm text-muted-foreground mb-2">{(report as any).subtitle}</p>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {report.summary}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{report.author}</span>
            <span>•</span>
            <span>{new Date(report.created_at).toLocaleDateString('pt-BR')}</span>
            {report.pdf_url && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 gap-1 ml-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(report.pdf_url!, '_blank');
                }}
              >
                <ExternalLink className="h-3 w-3 text-primary" />
                PDF
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </Link>

      {isAdmin && (
        <div className="absolute top-2 right-12">
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
              <DropdownMenuItem onClick={() => onEdit(report)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(report)}
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

export default function Reports() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [themeFilter, setThemeFilter] = useState<string>('todos');

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);

  const { data: reports = [], isLoading } = useReports({
    type: typeFilter,
    theme: themeFilter,
    search,
  });

  const createMutation = useCreateReport();
  const updateMutation = useUpdateReport();
  const deleteMutation = useDeleteReport();

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('todos');
    setThemeFilter('todos');
  };

  const handleCreate = () => {
    setEditingReport(null);
    setFormOpen(true);
  };

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    setFormOpen(true);
  };

  const handleDelete = (report: Report) => {
    setDeletingReport(report);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (editingReport) {
      await updateMutation.mutateAsync({ id: editingReport.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setFormOpen(false);
    setEditingReport(null);
  };

  const handleConfirmDelete = async () => {
    if (deletingReport) {
      await deleteMutation.mutateAsync(deletingReport.id);
      setDeleteDialogOpen(false);
      setDeletingReport(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios & Cartas"
        subtitle="Biblioteca de análises e relatórios"
        breadcrumbs={[{ label: 'Relatórios' }]}
        actions={
          isAdmin && (
            <Button className="gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Novo Relatório/Carta
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar relatórios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="carta_mensal">Carta Mensal</SelectItem>
            <SelectItem value="relatorio">Relatório</SelectItem>
            <SelectItem value="morning_call">Morning Call</SelectItem>
            <SelectItem value="nota">Nota</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1 ml-auto">
          <Button
            variant={view === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setView('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
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
      ) : reports.length === 0 ? (
        <NoResults query={search} onClear={clearFilters} />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="relative">
              <Link
                to={`/relatorios/${report.id}`}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border hover:border-primary/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('chip text-xs', typeColors[report.type || 'relatorio'])}>
                      {typeLabels[report.type || 'relatorio']}
                    </span>
                    {report.theme && (
                      <span className="chip chip-muted text-xs">{report.theme}</span>
                    )}
                    {!(report.is_published ?? true) && (
                      <span className="chip chip-warning text-xs">Rascunho</span>
                    )}
                  </div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {report.author} • {new Date(report.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {report.pdf_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(report.pdf_url!, '_blank');
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Link>
              {isAdmin && (
                <div className="absolute top-4 right-16">
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
                      <DropdownMenuItem onClick={() => handleEdit(report)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(report)}
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
          ))}
        </div>
      )}

      {/* Form Modal */}
      <ReportForm
        open={formOpen}
        onOpenChange={setFormOpen}
        report={editingReport}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
        title="Excluir documento"
        description={`Tem certeza que deseja excluir "${deletingReport?.title}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
