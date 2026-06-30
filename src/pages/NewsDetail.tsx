import { sanitizeHtml } from "@/lib/sanitize";
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { NewsForm } from '@/components/forms/NewsForm';
import {
  useCuratedNewsById,
  useUpdateCuratedNews,
  useDeleteCuratedNews,
} from '@/hooks/useCuratedNews';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Edit,
  Loader2,
  Trash2,
  ExternalLink,
  Calendar,
  Building2,
} from 'lucide-react';

export default function NewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: news, isLoading, error } = useCuratedNewsById(id);

  const updateMutation = useUpdateCuratedNews();
  const deleteMutation = useDeleteCuratedNews();

  const handleFormSubmit = async (data: any) => {
    if (news) {
      await updateMutation.mutateAsync({ id: news.id, ...data });
      setFormOpen(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (news) {
      await deleteMutation.mutateAsync(news.id);
      setDeleteDialogOpen(false);
      navigate('/noticias');
    }
  };

  // Format date without timezone issues - use the string directly
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!news || error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Notícia não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={news.title}
        breadcrumbs={[
          { label: 'Notícias', href: '/noticias' },
          { label: news.title },
        ]}
        actions={
          <div className="flex gap-2">
            {news.external_url && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.open(news.external_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Abrir Fonte
              </Button>
            )}
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
          <article className="bg-card rounded-xl border p-8">
            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 pb-6 border-b border-border">
              {news.source && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{news.source}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(news.published_date)}</span>
              </div>
              {!news.is_active && (
                <span className="chip chip-warning">Inativo</span>
              )}
            </div>

            {/* Content - render content_html if available */}
            {news.content_html ? (
              <div 
                className="prose prose-lg max-w-none text-foreground rich-text-content"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(news.content_html) }}
              />
            ) : news.external_url ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Esta notícia é um link externo.
                </p>
                <Button
                  className="gap-2"
                  onClick={() => window.open(news.external_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Fonte Original
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                Esta notícia ainda não possui conteúdo.
              </p>
            )}
          </article>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-4 sticky top-20">
            <div className="space-y-3">
              {news.external_url && (
                <Button
                  className="w-full gap-2"
                  onClick={() => window.open(news.external_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Fonte
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => navigate('/noticias')}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </div>

            {/* Info */}
            <div className="mt-6 pt-4 border-t border-border space-y-3">
              {news.source && (
                <div>
                  <p className="text-xs text-muted-foreground">Fonte</p>
                  <p className="text-sm font-medium text-foreground">{news.source}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Publicado em</p>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(news.published_date)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <NewsForm
        open={formOpen}
        onOpenChange={setFormOpen}
        news={news}
        onSubmit={handleFormSubmit}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
        title="Excluir notícia"
        description={`Tem certeza que deseja excluir "${news.title}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
