import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { NoResults } from '@/components/common/EmptyState';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { ArticleForm } from '@/components/forms/ArticleForm';
import {
  useArticles,
  useCreateArticle,
  useUpdateArticle,
  useDeleteArticle,
  Article,
} from '@/hooks/useArticles';
import { useAddRecent } from '@/hooks/useUserData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  Clock,
  ArrowRight,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
} from 'lucide-react';

interface ArticleCardProps {
  article: Article;
  isAdmin: boolean;
  onEdit: (article: Article) => void;
  onDelete: (article: Article) => void;
}

function ArticleCard({ article, isAdmin, onEdit, onDelete }: ArticleCardProps) {
  const addRecent = useAddRecent();

  const handleClick = () => {
    addRecent.mutate({ itemType: 'article', itemId: article.id });
  };

  return (
    <div className="content-card group relative">
      <Link
        to={`/artigos/${article.id}`}
        onClick={handleClick}
        className="block p-5"
      >
        <div className="flex flex-wrap gap-1.5 mb-3">
          {article.tags?.map((tag) => (
            <span key={tag} className="chip chip-muted text-xs">
              #{tag}
            </span>
          ))}
          {!(article.is_published ?? true) && (
            <span className="chip chip-warning text-xs">Rascunho</span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
          {article.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{article.subtitle}</p>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{article.author || 'Equipe Alta Vista'}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.read_time || 5} min
            </span>
            {(article as any).file_url && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 gap-1"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open((article as any).file_url, '_blank');
                }}
              >
                <FileText className="h-3 w-3 text-primary" />
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
              <DropdownMenuItem onClick={() => onEdit(article)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(article)}
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

export default function Articles() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [search, setSearch] = useState('');

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingArticle, setDeletingArticle] = useState<Article | null>(null);

  const { data: articles = [], isLoading } = useArticles({ search });

  const createMutation = useCreateArticle();
  const updateMutation = useUpdateArticle();
  const deleteMutation = useDeleteArticle();

  const handleCreate = () => {
    setEditingArticle(null);
    setFormOpen(true);
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setFormOpen(true);
  };

  const handleDelete = (article: Article) => {
    setDeletingArticle(article);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (editingArticle) {
      await updateMutation.mutateAsync({ id: editingArticle.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setFormOpen(false);
    setEditingArticle(null);
  };

  const handleConfirmDelete = async () => {
    if (deletingArticle) {
      await deleteMutation.mutateAsync(deletingArticle.id);
      setDeleteDialogOpen(false);
      setDeletingArticle(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Artigos"
        subtitle="Conteúdos e guias para o AAI"
        breadcrumbs={[{ label: 'Artigos' }]}
        actions={
          isAdmin && (
            <Button className="gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Novo Artigo
            </Button>
          )
        }
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar artigos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <NoResults query={search} onClear={() => setSearch('')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <ArticleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        article={editingArticle}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
        title="Excluir artigo"
        description={`Tem certeza que deseja excluir "${deletingArticle?.title}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
