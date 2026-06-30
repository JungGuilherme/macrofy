import { sanitizeHtml } from "@/lib/sanitize";
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { RecommendationForm } from '@/components/forms/RecommendationForm';
import {
  useRecommendation,
  useRecommendationMaterials,
  useUpdateRecommendation,
  useDeleteRecommendation,
  Recommendation,
} from '@/hooks/useRecommendations';
import { useToggleFavorite, useAddRecent, useInternalNotes, useAddInternalNote } from '@/hooks/useUserData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Star,
  Share2,
  Copy,
  ArrowLeft,
  AlertTriangle,
  FileText,
  ExternalLink,
  Clock,
  Edit,
  Loader2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

export default function RecommendationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { toggle: toggleFavorite, isFavorite } = useToggleFavorite();
  const addRecent = useAddRecent();
  const addNote = useAddInternalNote();
  const [noteText, setNoteText] = useState('');

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: rec, isLoading, error } = useRecommendation(id);
  const { data: materials = [] } = useRecommendationMaterials(id);
  const { data: notes = [] } = useInternalNotes(id);

  const updateMutation = useUpdateRecommendation();
  const deleteMutation = useDeleteRecommendation();

  useEffect(() => {
    if (rec) {
      addRecent.mutate({ itemType: 'recommendation', itemId: rec.id });
    }
  }, [rec?.id]);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const handleSaveNote = () => {
    if (!noteText.trim() || !id) return;
    addNote.mutate(
      { recommendationId: id, note: noteText },
      { onSuccess: () => setNoteText('') }
    );
  };

  const handleFormSubmit = async (data: any) => {
    if (rec) {
      await updateMutation.mutateAsync({ id: rec.id, ...data });
      setFormOpen(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (rec) {
      await deleteMutation.mutateAsync(rec.id);
      setDeleteDialogOpen(false);
      navigate('/recomendacoes');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!rec || error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Recomendação não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const favorited = isFavorite('recommendation', rec.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={rec.title}
        subtitle={rec.product_code || undefined}
        breadcrumbs={[
          { label: 'Recomendações', href: '/recomendacoes' },
          { label: rec.title },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-card rounded-xl border p-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={cn('chip', statusColors[rec.status || 'ativa'])}>
                {statusLabels[rec.status || 'ativa']}
              </span>
              <span className="chip chip-muted">{rec.category}</span>
              <span className="chip chip-muted capitalize">{rec.risk_level}</span>
              {rec.tags?.map((tag) => (
                <span key={tag} className="chip chip-muted">
                  #{tag}
                </span>
              ))}
            </div>
            <p className="text-lg text-foreground">{rec.thesis}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Publicado em {new Date(rec.created_at).toLocaleDateString('pt-BR')} •
              Atualizado em {new Date(rec.updated_at).toLocaleDateString('pt-BR')}
            </p>

            {/* PDF and External Link */}
            {((rec as any).file_url || (rec as any).external_link) && (
              <div className="mt-4 pt-4 border-t border-border flex gap-2">
                {(rec as any).file_url && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => window.open((rec as any).file_url, '_blank')}
                  >
                    <FileText className="h-4 w-4 text-primary" />
                    Ver PDF
                  </Button>
                )}
                {(rec as any).external_link && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => window.open((rec as any).external_link, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 text-primary" />
                    Abrir Link
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Content HTML */}
          {(rec as any).content_html && (
            <div className="bg-card rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Conteúdo
              </h2>
              <div 
                className="prose prose-sm sm:prose max-w-none text-foreground rich-text-content"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml((rec as any).content_html) }}
              />
            </div>
          )}

          {/* Summary - fallback for old content */}
          {rec.executive_summary && (
            <div className="bg-card rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Resumo Executivo
              </h2>
              <p className="text-foreground">{rec.executive_summary}</p>
            </div>
          )}

          {/* Risks */}
          {rec.risks && (
            <div className="bg-card rounded-xl border p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <h2 className="text-lg font-semibold text-foreground">Riscos</h2>
              </div>
              <p className="text-foreground">{rec.risks}</p>
            </div>
          )}

          {/* Client Explanation */}
          {rec.client_explanation && (
            <div className="bg-card rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Como Explicar para o Cliente
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleCopyText(rec.client_explanation!, 'Texto')}
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-foreground leading-relaxed">
                  {rec.client_explanation}
                </p>
              </div>
            </div>
          )}

          {/* Materials */}
          <div className="bg-card rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Materiais</h2>
            {materials.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {materials.map((material) => (
                  <a
                    key={material.id}
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    {material.type === 'pdf' && <FileText className="h-8 w-8 text-primary" />}
                    {material.type === 'onepager' && <FileText className="h-8 w-8 text-gold" />}
                    {material.type === 'link' && <ExternalLink className="h-8 w-8 text-muted-foreground" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">{material.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{material.type}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum material disponível</p>
            )}
          </div>

          {/* History */}
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Histórico</h2>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Recomendação criada
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(rec.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              {rec.created_at !== rec.updated_at && (
                <div className="flex gap-4">
                  <div className="w-2 h-2 rounded-full bg-warning mt-2" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Última atualização
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(rec.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-4 sticky top-20">
            <div className="space-y-3">
              <Button
                className="w-full gap-2"
                onClick={() => toggleFavorite('recommendation', rec.id)}
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

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <Share2 className="h-4 w-4" />
                    Compartilhar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Compartilhar Recomendação</DialogTitle>
                    <DialogDescription>
                      Escolha como deseja compartilhar
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={() => handleCopyText(window.location.href, 'Link')}
                    >
                      <Copy className="h-4 w-4" />
                      Copiar link
                    </Button>
                    {rec.client_explanation && (
                      <>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3"
                          onClick={() => handleCopyText(rec.client_explanation!, 'Mensagem')}
                        >
                          <FileText className="h-4 w-4" />
                          Copiar mensagem curta
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3"
                          onClick={() =>
                            handleCopyText(
                              `${rec.title} (${rec.product_code})\n\n${rec.thesis}\n\n${rec.client_explanation}`,
                              'Mensagem completa'
                            )
                          }
                        >
                          <FileText className="h-4 w-4" />
                          Copiar mensagem completa
                        </Button>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {rec.client_explanation && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => handleCopyText(rec.client_explanation!, 'Argumento')}
                >
                  <Copy className="h-4 w-4" />
                  Copiar argumento
                </Button>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-2">
                Nota interna
              </h3>
              <textarea
                className="w-full h-24 p-3 text-sm bg-muted/50 rounded-lg border-0 resize-none focus:ring-1 focus:ring-primary"
                placeholder="Adicione uma nota pessoal sobre esta recomendação..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={handleSaveNote}
                disabled={!noteText.trim() || addNote.isPending}
              >
                {addNote.isPending ? 'Salvando...' : 'Salvar nota'}
              </Button>

              {notes.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Notas salvas:</h4>
                  {notes.map((note) => (
                    <div key={note.id} className="p-2 bg-muted/30 rounded text-xs">
                      <p className="text-foreground">{note.note}</p>
                      <p className="text-muted-foreground mt-1">
                        {new Date(note.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <RecommendationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        recommendation={rec}
        onSubmit={handleFormSubmit}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
        title="Excluir recomendação"
        description={`Tem certeza que deseja excluir "${rec.title}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
