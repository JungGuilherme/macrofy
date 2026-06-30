import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, ExternalLink, Rss } from 'lucide-react';
import { ThemeMultiSelect } from './ThemeMultiSelect';
import {
  RssFeed, RssFeedItem,
  useCreateRssFeed, useUpdateRssFeed, useDeleteRssFeed,
} from '@/hooks/useRssFeeds';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { NewsTheme } from '@/lib/newsThemes';

interface FeedDraft {
  id?: string;
  name: string;
  feed_url: string;
  themes: NewsTheme[];
  is_active: boolean;
  removed?: boolean;
  isNew?: boolean;
}

interface FeedManagementDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeds: RssFeed[];
}

export function FeedManagementDrawer({ open, onOpenChange, feeds }: FeedManagementDrawerProps) {
  const [drafts, setDrafts] = useState<FeedDraft[]>([]);
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const createMut = useCreateRssFeed();
  const updateMut = useUpdateRssFeed();
  const deleteMut = useDeleteRssFeed();

  useEffect(() => {
    if (open) {
      setDrafts(
        feeds.map((f) => ({
          id: f.id,
          name: f.name,
          feed_url: f.feed_url || '',
          themes: f.themes || [],
          is_active: f.is_active ?? true,
        }))
      );
    }
  }, [open, feeds]);

  const update = (idx: number, patch: Partial<FeedDraft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const addNew = () => {
    setDrafts((prev) => [
      ...prev,
      { name: '', feed_url: '', themes: [], is_active: true, isNew: true },
    ]);
  };

  const validateUrl = async (idx: number) => {
    const url = drafts[idx].feed_url.trim();
    if (!url) return;
    const key = String(idx);
    setValidating((v) => ({ ...v, [key]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('parse-rss', { body: { url } });
      if (error) throw error;
      const count = (data?.items as any[])?.length || 0;
      toast.success(`Feed válido — ${count} notícias`);
    } catch {
      toast.error('Não foi possível validar o feed.');
    } finally {
      setValidating((v) => ({ ...v, [key]: false }));
    }
  };

  const handleSave = async () => {
    // validation
    for (const d of drafts) {
      if (d.removed) continue;
      if (!d.name.trim()) { toast.error('Todas as fontes precisam de um nome.'); return; }
      if (!d.feed_url.trim()) { toast.error(`A fonte "${d.name}" precisa de URL.`); return; }
    }

    setSaving(true);
    try {
      // delete
      const toDelete = drafts.filter((d) => d.removed && d.id).map((d) => d.id!);
      if (toDelete.length) {
        await Promise.all(toDelete.map((id) => deleteMut.mutateAsync(id)));
      }

      // update existing
      const toUpdate = drafts.filter((d) => !d.removed && d.id);
      if (toUpdate.length) {
        await Promise.all(
          toUpdate.map((d) =>
            updateMut.mutateAsync({
              id: d.id!,
              name: d.name.trim(),
              feed_url: d.feed_url.trim(),
              themes: d.themes,
              is_active: d.is_active,
            })
          )
        );
      }

      // create new (parse first to populate items)
      const toCreate = drafts.filter((d) => !d.removed && !d.id);
      if (toCreate.length) {
        const maxOrder = feeds.reduce((m, f) => Math.max(m, f.display_order), 0);
        for (let i = 0; i < toCreate.length; i++) {
          const d = toCreate[i];
          let items: RssFeedItem[] = [];
          try {
            const { data: parsed, error } = await supabase.functions.invoke('parse-rss', {
              body: { url: d.feed_url.trim() },
            });
            if (!error && parsed?.items) items = parsed.items as RssFeedItem[];
          } catch { /* ignore parsing errors, save with empty items */ }
          await createMut.mutateAsync({
            name: d.name.trim(),
            items,
            display_order: maxOrder + i + 1,
            feed_url: d.feed_url.trim(),
            themes: d.themes,
            is_active: d.is_active,
          });
        }
      }

      toast.success('Feeds salvos com sucesso');
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar feeds');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = drafts.filter((d) => !d.removed).length;
  const removedCount = drafts.filter((d) => d.removed && d.id).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col overflow-hidden p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="text-sm flex items-center gap-2">
            <Rss className="h-4 w-4 text-primary" />
            Gerenciar feeds RSS
            <span className="ml-1 text-xs text-muted-foreground font-normal">
              {activeCount} ativos{removedCount > 0 ? ` · ${removedCount} a remover` : ''}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {drafts.map((draft, idx) => {
            if (draft.removed) {
              return (
                <div key={draft.id || idx} className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-destructive line-through">{draft.name || 'Sem nome'}</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => update(idx, { removed: false })}>
                    Restaurar
                  </Button>
                </div>
              );
            }
            return (
              <div key={draft.id || `new-${idx}`} className="rounded-lg border border-border bg-card p-3 space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome</Label>
                    <Input
                      value={draft.name}
                      onChange={(e) => update(idx, { name: e.target.value })}
                      placeholder="Bloomberg, InfoMoney…"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">URL RSS</Label>
                    <div className="flex gap-1 mt-1">
                      <Input
                        value={draft.feed_url}
                        onChange={(e) => update(idx, { feed_url: e.target.value })}
                        placeholder="https://exemplo.com/rss.xml"
                        className="h-8 text-xs flex-1"
                        type="url"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => validateUrl(idx)}
                        disabled={!draft.feed_url.trim() || validating[String(idx)]}
                      >
                        {validating[String(idx)] ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-end">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Temas</Label>
                    <div className="mt-1">
                      <ThemeMultiSelect
                        value={draft.themes}
                        onChange={(themes) => update(idx, { themes })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-border bg-background">
                    <Switch
                      checked={draft.is_active}
                      onCheckedChange={(v) => update(idx, { is_active: v })}
                    />
                    <span className="text-[11px] text-muted-foreground">{draft.is_active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive/70 hover:text-destructive"
                    onClick={() => {
                      if (draft.id) update(idx, { removed: true });
                      else setDrafts((prev) => prev.filter((_, i) => i !== idx));
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Button variant="outline" size="sm" className="w-full text-xs" onClick={addNew}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Adicionar feed
          </Button>
        </div>

        <SheetFooter className="px-5 py-3 border-t border-border flex-row gap-2 sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Salvar tudo
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
