import { useState, useEffect } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, Rss, ExternalLink } from 'lucide-react';
import { RssFeed, RssFeedItem } from '@/hooks/useRssFeeds';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeedDraft {
  id?: string; // undefined = new
  name: string;
  feed_url: string;
  removed?: boolean;
}

interface ThemeEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: string;
  feeds: RssFeed[];
  onSave: (data: {
    oldTheme: string;
    newTheme: string;
    feedsToCreate: { name: string; feed_url: string }[];
    feedsToUpdate: { id: string; name: string; feed_url: string }[];
    feedsToDelete: string[];
  }) => Promise<void>;
  isSaving: boolean;
}

export function ThemeEditDrawer({
  open, onOpenChange, theme, feeds, onSave, isSaving,
}: ThemeEditDrawerProps) {
  const [themeName, setThemeName] = useState(theme);
  const [drafts, setDrafts] = useState<FeedDraft[]>([]);
  const [validating, setValidating] = useState<Record<number, boolean>>({});

  // Populate drafts when opening
  useEffect(() => {
    if (open) {
      setThemeName(theme);
      setDrafts(
        feeds.map((f) => ({
          id: f.id,
          name: f.name,
          feed_url: f.feed_url || '',
        }))
      );
    }
  }, [open, theme, feeds]);

  const addFeed = () => {
    setDrafts((prev) => [...prev, { name: '', feed_url: '' }]);
  };

  const updateDraft = (idx: number, field: 'name' | 'feed_url', value: string) => {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  const removeDraft = (idx: number) => {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, removed: true } : d)));
  };

  const restoreDraft = (idx: number) => {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, removed: false } : d)));
  };

  const validateFeedUrl = async (idx: number) => {
    const url = drafts[idx].feed_url.trim();
    if (!url) return;
    setValidating((v) => ({ ...v, [idx]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('parse-rss', {
        body: { url },
      });
      if (error) throw error;
      const count = (data?.items as any[])?.length || 0;
      toast.success(`Feed válido — ${count} notícias encontradas`);
    } catch {
      toast.error('Não foi possível validar o feed. Verifique a URL.');
    } finally {
      setValidating((v) => ({ ...v, [idx]: false }));
    }
  };

  const activeDrafts = drafts.filter((d) => !d.removed);
  const removedDrafts = drafts.filter((d) => d.removed && d.id);

  const handleSave = async () => {
    if (!themeName.trim()) {
      toast.error('O nome do quadro é obrigatório.');
      return;
    }

    // Validate: all active feeds need name and url
    for (const d of activeDrafts) {
      if (!d.name.trim()) {
        toast.error('Todas as fontes precisam de um nome.');
        return;
      }
      if (!d.feed_url.trim()) {
        toast.error(`A fonte "${d.name}" precisa de uma URL RSS.`);
        return;
      }
    }

    const feedsToCreate = activeDrafts.filter((d) => !d.id).map((d) => ({
      name: d.name.trim(),
      feed_url: d.feed_url.trim(),
    }));

    const feedsToUpdate = activeDrafts.filter((d) => d.id).map((d) => ({
      id: d.id!,
      name: d.name.trim(),
      feed_url: d.feed_url.trim(),
    }));

    const feedsToDelete = removedDrafts.map((d) => d.id!);

    await onSave({
      oldTheme: theme,
      newTheme: themeName.trim(),
      feedsToCreate,
      feedsToUpdate,
      feedsToDelete,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col overflow-hidden">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="text-base">Editar Quadro de Notícias</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Theme Name */}
          <div className="space-y-1.5">
            <Label htmlFor="theme-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nome do Quadro
            </Label>
            <Input
              id="theme-name"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              placeholder="Ex: Economia, Cripto, EUA..."
              className="h-9 text-sm"
            />
          </div>

          {/* Feeds List */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fontes deste Quadro
            </Label>

            {activeDrafts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                <Rss className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">
                  Nenhuma fonte cadastrada. Adicione um feed RSS.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft, idx) => {
                  if (draft.removed) return null;
                  return (
                    <div
                      key={draft.id || `new-${idx}`}
                      className="rounded-lg border border-border bg-card p-3 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <div>
                            <Label className="text-[11px] text-muted-foreground">Nome da fonte</Label>
                            <Input
                              value={draft.name}
                              onChange={(e) => updateDraft(idx, 'name', e.target.value)}
                              placeholder="Ex: Bloomberg, InfoMoney..."
                              className="h-8 text-xs mt-0.5"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] text-muted-foreground">Link RSS</Label>
                            <div className="flex gap-1.5 mt-0.5">
                              <Input
                                value={draft.feed_url}
                                onChange={(e) => updateDraft(idx, 'feed_url', e.target.value)}
                                placeholder="https://exemplo.com/rss.xml"
                                className="h-8 text-xs flex-1"
                                type="url"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-[10px]"
                                onClick={() => validateFeedUrl(idx)}
                                disabled={!draft.feed_url.trim() || validating[idx]}
                              >
                                {validating[idx] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ExternalLink className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10 flex-shrink-0 mt-4"
                          onClick={() => removeDraft(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Removed feeds indicator */}
            {removedDrafts.length > 0 && (
              <div className="rounded-lg border border-dashed border-destructive/30 bg-destructive/5 p-2">
                <p className="text-[11px] text-destructive/80 font-medium mb-1">
                  {removedDrafts.length} fonte(s) marcada(s) para remoção
                </p>
                <div className="flex flex-wrap gap-1">
                  {drafts.map((d, idx) =>
                    d.removed && d.id ? (
                      <button
                        key={d.id}
                        onClick={() => restoreDraft(idx)}
                        className="text-[10px] text-destructive/60 hover:text-destructive bg-destructive/10 rounded px-1.5 py-0.5 line-through hover:no-underline transition-colors"
                      >
                        {d.name || 'Sem nome'}
                      </button>
                    ) : null
                  )}
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs mt-2"
              onClick={addFeed}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adicionar Fonte
            </Button>
          </div>
        </div>

        <SheetFooter className="pt-4 border-t border-border flex-row gap-2 sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Salvar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
