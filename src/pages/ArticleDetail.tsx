import { RichHtmlContent } from "@/components/reports/useHtmlWithEmbeds";
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { ArticleForm } from '@/components/forms/ArticleForm';
import {
  useArticle,
  useUpdateArticle,
  useDeleteArticle,
} from '@/hooks/useArticles';
import { useToggleFavorite, useAddRecent } from '@/hooks/useUserData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Star,
  ArrowLeft,
  Clock,
  Edit,
  Loader2,
  Trash2,
  FileText,
  User,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { toggle: toggleFavorite, isFavorite } = useToggleFavorite();
  const addRecent = useAddRecent();

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: article, isLoading, error } = useArticle(id);

  const updateMutation = useUpdateArticle();
  const deleteMutation = useDeleteArticle();

  useEffect(() => {
    if (article) {
      addRecent.mutate({ itemType: 'article', itemId: article.id });
    }
  }, [article?.id]);

  const handleFormSubmit = async (data: any) => {
    if (article) {
      await updateMutation.mutateAsync({ id: article.id, ...data });
      setFormOpen(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (article) {
      await deleteMutation.mutateAsync(article.id);
      setDeleteDialogOpen(false);
      navigate('/artigos');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!article || error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Artigo não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const favorited = isFavorite('article', article.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={article.title}
        subtitle={article.subtitle || undefined}
        breadcrumbs={[
          { label: 'Artigos', href: '/artigos' },
          { label: article.title },
        ]}
        actions={
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setFormOpen(true)}>
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Article Content */}
          <article className="bg-card rounded-xl border p-8">
            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {article.tags.map((tag) => (
                  <span key={tag} className="chip chip-muted">
                    #{tag}
                  </span>
                ))}
                {!(article.is_published ?? true) && (
                  <span className="chip chip-warning">Rascunho</span>
                )}
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 pb-6 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{article.author || 'Equipe Alta Vista'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{article.read_time || 5} min de leitura</span>
              </div>
              <span>{new Date(article.created_at).toLocaleDateString('pt-BR')}</span>
            </div>

            {/* Body - prefer content_html, fallback to body */}
            {(article as any).content_html ? (
              <RichHtmlContent
                html={(article as any).content_html}
                className="prose prose-lg max-w-none text-foreground rich-text-content"
              />
            ) : article.body ? (
              <div className="prose prose-lg max-w-none">
                {article.body.split('\n').map((paragraph, index) => (
                  <p key={index} className="text-foreground mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                Este artigo ainda não possui conteúdo.
              </p>
            )}

            {/* PDF and External Link */}
            {((article as any).file_url || (article as any).external_url) && (
              <div className="mt-8 pt-6 border-t border-border flex gap-2">
                {(article as any).file_url && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => window.open((article as any).file_url, '_blank')}
                  >
                    <FileText className="h-4 w-4 text-primary" />
                    Ver PDF
                  </Button>
                )}
                {(article as any).external_url && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => window.open((article as any).external_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 text-primary" />
                    Abrir Link
                  </Button>
                )}
              </div>
            )}
          </article>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-4 sticky top-20">
            <div className="space-y-3">
              <Button
                className="w-full gap-2"
                onClick={() => toggleFavorite('article', article.id)}
                variant={favorited ? 'secondary' : 'default'}
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    favorited && 'fill-gold text-gold'
                  )}
                />
                {favorited ? 'Favoritado' : 'Favoritar'}
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => navigate('/artigos')}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </div>

            {/* Info */}
            <div className="mt-6 pt-4 border-t border-border space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Publicado em</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(article.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {article.updated_at !== article.created_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Atualizado em</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(article.updated_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <ArticleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        article={article}
        onSubmit={handleFormSubmit}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
        title="Excluir artigo"
        description={`Tem certeza que deseja excluir "${article.title}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
