import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Plus, Tags } from 'lucide-react';
import { useRssFeeds, buildAggregatedNews, type AggregatedNewsRow } from '@/hooks/useRssFeeds';
import {
  useCuratedNews, useDeleteCuratedNews, useToggleFeaturedNews,
  type CuratedNews,
} from '@/hooks/useCuratedNews';
import { NewsPortal } from '@/components/news/NewsPortal';
import { ManualNewsDrawer } from '@/components/news/ManualNewsDrawer';
import { ThemeManagementDrawer } from '@/components/news/ThemeManagementDrawer';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';

export default function News() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const { data: feeds = [], isLoading: feedsLoading } = useRssFeeds();
  const { data: manualNews = [], isLoading: manualLoading } = useCuratedNews();
  const deleteManualMut = useDeleteCuratedNews();
  const toggleFeaturedMut = useToggleFeaturedNews();

  const isLoading = feedsLoading || manualLoading;

  const [search, setSearch] = useState('');

  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
  const [manualDrawerOpen, setManualDrawerOpen] = useState(false);
  const [editingManual, setEditingManual] = useState<CuratedNews | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rows = useMemo(
    () => buildAggregatedNews(feeds, manualNews as any, { search }),
    [feeds, manualNews, search]
  );

  const openCreate = () => { setEditingManual(null); setManualDrawerOpen(true); };
  const openEdit = (row: AggregatedNewsRow) => {
    if (row.origin !== 'manual') return;
    const id = row.id.replace(/^manual:/, '');
    const found = (manualNews as any[]).find((n) => n.id === id);
    if (found) { setEditingManual(found); setManualDrawerOpen(true); }
  };
  const askDelete = (row: AggregatedNewsRow) => {
    if (row.origin !== 'manual') return;
    setDeletingId(row.id.replace(/^manual:/, ''));
    setDeleteOpen(true);
  };
  const confirmDelete = async () => {
    if (!deletingId) return;
    await deleteManualMut.mutateAsync(deletingId);
    setDeleteOpen(false);
    setDeletingId(null);
  };
  const toggleFeatured = async (row: AggregatedNewsRow) => {
    if (row.origin !== 'manual') return;
    await toggleFeaturedMut.mutateAsync({
      id: row.id.replace(/^manual:/, ''),
      is_featured: !row.isFeatured,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-1 border-b border-border">
        <div>
          <h1
            className="text-2xl font-bold text-foreground tracking-tight"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
          >
            Notícias
          </h1>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setThemeDrawerOpen(true)}>
                <Tags className="h-3.5 w-3.5 mr-1.5" />
                Feeds
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Adicionar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Portal layout */}
      <NewsPortal
        rows={rows}
        feeds={feeds}
        isAdmin={isAdmin}
        onToggleFeatured={toggleFeatured}
        onEditManual={openEdit}
        onDeleteManual={askDelete}
      />

      {/* Drawers */}
      <ThemeManagementDrawer
        open={themeDrawerOpen}
        onOpenChange={setThemeDrawerOpen}
      />
      <ManualNewsDrawer
        open={manualDrawerOpen}
        onOpenChange={setManualDrawerOpen}
        editing={editingManual}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        isLoading={deleteManualMut.isPending}
        title="Excluir notícia"
        description="Esta notícia será removida permanentemente."
      />
    </div>
  );
}
