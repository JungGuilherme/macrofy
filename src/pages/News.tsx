import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Newspaper, Loader2, Search, Plus, Star, Tags } from 'lucide-react';
import { useRssFeeds, buildAggregatedNews, type AggregatedNewsRow } from '@/hooks/useRssFeeds';
import {
  useCuratedNews, useDeleteCuratedNews, useToggleFeaturedNews,
  type CuratedNews,
} from '@/hooks/useCuratedNews';
import { NEWS_THEMES, type NewsTheme } from '@/lib/newsThemes';
import { useThemeLabels, resolveLabel, getOrderedThemes } from '@/hooks/useThemeLabels';
import { NewsTerminalList } from '@/components/news/NewsTerminalList';
import { ManualNewsDrawer } from '@/components/news/ManualNewsDrawer';
import { ThemeManagementDrawer } from '@/components/news/ThemeManagementDrawer';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { cn } from '@/lib/utils';

export default function News() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const { data: feeds = [], isLoading: feedsLoading } = useRssFeeds();
  const { data: manualNews = [], isLoading: manualLoading } = useCuratedNews();
  const { data: themeOverrides } = useThemeLabels();
  const deleteManualMut = useDeleteCuratedNews();
  const toggleFeaturedMut = useToggleFeaturedNews();

  const isLoading = feedsLoading || manualLoading;

  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState<NewsTheme | 'all'>('all');
  const [onlyFeatured, setOnlyFeatured] = useState(false);

  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
  const [manualDrawerOpen, setManualDrawerOpen] = useState(false);
  const [editingManual, setEditingManual] = useState<CuratedNews | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rows = useMemo(
    () => buildAggregatedNews(feeds, manualNews as any, { theme, onlyFeatured, search }),
    [feeds, manualNews, theme, onlyFeatured, search]
  );

  const featuredCount = useMemo(
    () => rows.filter((r) => r.isFeatured).length,
    [rows]
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

  return (
    <div className="space-y-3 animate-fade-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Notícias</h1>
          <span className="text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? 'item' : 'itens'}
            {featuredCount > 0 && ` · ${featuredCount} em destaque`}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
                Temas e feeds
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Adicionar notícia
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Theme filter chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setTheme('all')}
          className={cn(
            'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
            theme === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-accent'
          )}
        >
          Todos
        </button>
        {getOrderedThemes(themeOverrides).map((tValue) => (
          <button
            key={tValue}
            onClick={() => setTheme(tValue)}
            className={cn(
              'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
              theme === tValue
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-accent'
            )}
          >
            {resolveLabel(tValue, themeOverrides)}
          </button>
        ))}
        <div className="mx-1 h-4 w-px bg-border shrink-0" />
        <button
          onClick={() => setOnlyFeatured((v) => !v)}
          className={cn(
            'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors flex items-center gap-1',
            onlyFeatured
              ? 'bg-primary/15 text-primary border-primary/40'
              : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-accent'
          )}
        >
          <Star className={cn('h-3 w-3', onlyFeatured && 'fill-primary')} />
          Destaques
        </button>
      </div>

      {/* Terminal list */}
      <NewsTerminalList
        rows={rows}
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
