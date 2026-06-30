import { sanitizeHtml } from "@/lib/sanitize";
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { ReportForm } from '@/components/forms/ReportForm';
import {
  useReport,
  useUpdateReport,
  useDeleteReport,
} from '@/hooks/useReports';
import { useToggleFavorite, useAddRecent } from '@/hooks/useUserData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Star,
  ArrowLeft,
  Edit,
  Loader2,
  Trash2,
  FileText,
  User,
  Calendar,
  Download,
  ExternalLink,
  Link as LinkIcon,
  Video,
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

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { toggle: toggleFavorite, isFavorite } = useToggleFavorite();
  const addRecent = useAddRecent();

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: report, isLoading, error } = useReport(id);

  const updateMutation = useUpdateReport();
  const deleteMutation = useDeleteReport();

  useEffect(() => {
    if (report) {
      addRecent.mutate({ itemType: 'report', itemId: report.id });
    }
  }, [report?.id]);

  const handleFormSubmit = async (data: any) => {
    if (report) {
      await updateMutation.mutateAsync({ id: report.id, ...data });
      setFormOpen(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (report) {
      await deleteMutation.mutateAsync(report.id);
      setDeleteDialogOpen(false);
      navigate('/relatorios');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report || error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Documento não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const favorited = isFavorite('report', report.id);
  const hasMaterials = (report.materials && report.materials.length > 0) || report.pdf_url || report.external_url;

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <LinkIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={report.title}
        subtitle={report.subtitle || typeLabels[report.type || 'relatorio']}
        breadcrumbs={[
          { label: 'Relatórios', href: '/relatorios' },
          { label: report.title },
        ]}
        actions={
          <div className="flex gap-2">
            {report.pdf_url && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.open(report.pdf_url!, '_blank')}
              >
                <Download className="h-4 w-4" />
                Download PDF
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
          {/* Report Content */}
          <article className="bg-card rounded-xl border p-8">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className={cn('chip', typeColors[report.type || 'relatorio'])}>
                {typeLabels[report.type || 'relatorio']}
              </span>
              {report.theme && (
                <span className="chip chip-muted">{report.theme}</span>
              )}
              {report.tags?.map((tag) => (
                <span key={tag} className="chip chip-muted">
                  #{tag}
                </span>
              ))}
              {!(report.is_published ?? true) && (
                <span className="chip chip-warning">Rascunho</span>
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 pb-6 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{report.author || 'Equipe Research'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(report.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Content - prefer content_html, fallback to summary */}
            {report.content_html ? (
              <div 
                className="prose prose-lg max-w-none text-foreground rich-text-content"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(report.content_html) }}
              />
            ) : report.summary ? (
              <div className="prose prose-lg max-w-none">
                {report.summary.split('\n').map((paragraph, index) => (
                  <p key={index} className="text-foreground mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                Este documento ainda não possui resumo.
              </p>
            )}

            {/* Materials Section */}
            {hasMaterials && (
              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold mb-4">Materiais</h3>
                <div className="flex flex-wrap gap-2">
                  {report.pdf_url && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => window.open(report.pdf_url!, '_blank')}
                    >
                      <FileText className="h-4 w-4" />
                      Ver PDF
                    </Button>
                  )}
                  {report.external_url && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => window.open(report.external_url!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir Link
                    </Button>
                  )}
                  {report.materials?.map((material, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="gap-2"
                      onClick={() => window.open(material.url, '_blank')}
                    >
                      {getMaterialIcon(material.type)}
                      {material.label}
                    </Button>
                  ))}
                </div>
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
                onClick={() => toggleFavorite('report', report.id)}
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
                onClick={() => navigate('/relatorios')}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </div>

            {/* Info */}
            <div className="mt-6 pt-4 border-t border-border space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="text-sm font-medium text-foreground">
                  {typeLabels[report.type || 'relatorio']}
                </p>
              </div>
              {report.theme && (
                <div>
                  <p className="text-xs text-muted-foreground">Tema</p>
                  <p className="text-sm font-medium text-foreground">{report.theme}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Publicado em</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(report.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <ReportForm
        open={formOpen}
        onOpenChange={setFormOpen}
        report={report}
        onSubmit={handleFormSubmit}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
        title="Excluir documento"
        description={`Tem certeza que deseja excluir "${report.title}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
