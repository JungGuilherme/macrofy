import { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Tags, Pencil, RotateCcw, Check, X, Plus, Minus,
  Rss, Trash2, ExternalLink, ChevronDown, ChevronRight,
  Eye, EyeOff, ArrowUp, ArrowDown,
} from 'lucide-react';
import { NEWS_THEMES, type NewsTheme, themeChipClass } from '@/lib/newsThemes';
import {
  useThemeLabels, useUpsertThemeLabel, useResetThemeLabel, resolveLabel,
  useSetThemeHidden, useSetThemeOrder, getOrderedThemes,
} from '@/hooks/useThemeLabels';
import {
  useRssFeeds, useUpdateRssFeed, useCreateRssFeed, useDeleteRssFeed,
  type RssFeed, type RssFeedItem,
} from '@/hooks/useRssFeeds';
import {
  useCustomThemes, useCreateCustomTheme, useUpdateCustomTheme, useDeleteCustomTheme,
  CUSTOM_THEME_COLORS, customThemeChipClass, type CustomTheme,
} from '@/hooks/useCustomThemes';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ThemeManagementDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NewFeedDraft {
  name: string;
  feed_url: string;
  themes: NewsTheme[];
}

export function ThemeManagementDrawer({ open, onOpenChange }: ThemeManagementDrawerProps) {
  const { data: overrides } = useThemeLabels();
  const { data: feeds = [] } = useRssFeeds();
  const upsertLabel = useUpsertThemeLabel();
  const resetLabel = useResetThemeLabel();
  const setHidden = useSetThemeHidden();
  const setOrder = useSetThemeOrder();
  const updateFeed = useUpdateRssFeed();
  const createFeed = useCreateRssFeed();
  const deleteFeed = useDeleteRssFeed();

  // Custom themes
  const { data: customThemes = [] } = useCustomThemes();
  const createCustomTheme = useCreateCustomTheme();
  const updateCustomTheme = useUpdateCustomTheme();
  const deleteCustomTheme = useDeleteCustomTheme();

  const [showNewTheme, setShowNewTheme] = useState(false);
  const [newThemeLabel, setNewThemeLabel] = useState('');
  const [newThemeColor, setNewThemeColor] = useState('blue');
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [customDraft, setCustomDraft] = useState<{ label: string; color_key: string }>({ label: '', color_key: 'blue' });

  // Theme editing state
  const [editing, setEditing] = useState<NewsTheme | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [expanded, setExpanded] = useState<NewsTheme | null>(null);

  // Feeds section state
  const [feedsOpen, setFeedsOpen] = useState(true);
  const [editingFeedId, setEditingFeedId] = useState<string | null>(null);
  const [feedDraft, setFeedDraft] = useState<{ name: string; feed_url: string }>({ name: '', feed_url: '' });
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const [showNew, setShowNew] = useState(false);
  const [newFeed, setNewFeed] = useState<NewFeedDraft>({ name: '', feed_url: '', themes: [] });

  useEffect(() => {
    if (!open) {
      setEditing(null); setExpanded(null); setEditingFeedId(null); setShowNew(false);
      setNewFeed({ name: '', feed_url: '', themes: [] });
    }
  }, [open]);

  const feedsByTheme = useMemo(() => {
    const map: Record<string, RssFeed[]> = {};
    for (const t of NEWS_THEMES) map[t.value] = [];
    for (const f of feeds) {
      for (const t of f.themes || []) {
        if (map[t]) map[t].push(f);
      }
    }
    return map;
  }, [feeds]);

  // ============ Theme label handlers ============
  const startEditTheme = (theme: NewsTheme) => {
    setEditing(theme);
    setDraftLabel(resolveLabel(theme, overrides));
  };
  const saveLabel = async () => {
    if (!editing) return;
    const trimmed = draftLabel.trim();
    if (!trimmed) { toast.error('O nome não pode ficar vazio.'); return; }
    try {
      await upsertLabel.mutateAsync({ theme: editing, label: trimmed });
      toast.success('Nome do tema atualizado');
      setEditing(null);
    } catch { toast.error('Erro ao salvar nome'); }
  };
  const resetToDefault = async (theme: NewsTheme) => {
    try { await resetLabel.mutateAsync(theme); toast.success('Nome restaurado'); }
    catch { toast.error('Erro ao restaurar'); }
  };

  const toggleHidden = async (theme: NewsTheme, hidden: boolean) => {
    try {
      await setHidden.mutateAsync({ theme, hidden });
      toast.success(hidden ? 'Tema ocultado' : 'Tema exibido');
    } catch { toast.error('Erro ao alterar visibilidade'); }
  };

  const moveTheme = async (theme: NewsTheme, direction: -1 | 1) => {
    const ordered = getOrderedThemes(overrides, true);
    const idx = ordered.indexOf(theme);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
    const next = [...ordered];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    try {
      await setOrder.mutateAsync(next.map((t, i) => ({ theme: t, display_order: i })));
    } catch { toast.error('Erro ao reordenar'); }
  };

  // ============ Custom theme handlers ============
  const handleCreateCustomTheme = async () => {
    if (!newThemeLabel.trim()) { toast.error('Nome obrigatório.'); return; }
    try {
      await createCustomTheme.mutateAsync({
        label: newThemeLabel.trim(),
        color_key: newThemeColor,
        display_order: 1000 + customThemes.length,
      });
      toast.success('Tema criado');
      setShowNewTheme(false);
      setNewThemeLabel('');
      setNewThemeColor('blue');
    } catch { toast.error('Erro ao criar tema'); }
  };
  const startEditCustom = (t: CustomTheme) => {
    setEditingCustomId(t.id);
    setCustomDraft({ label: t.label, color_key: t.color_key });
  };
  const saveCustom = async (t: CustomTheme) => {
    if (!customDraft.label.trim()) { toast.error('Nome obrigatório.'); return; }
    try {
      await updateCustomTheme.mutateAsync({
        id: t.id, label: customDraft.label.trim(), color_key: customDraft.color_key,
      });
      toast.success('Tema atualizado');
      setEditingCustomId(null);
    } catch { toast.error('Erro ao salvar tema'); }
  };
  const removeCustom = async (t: CustomTheme) => {
    if (!confirm(`Excluir o tema "${t.label}"? Essa ação não pode ser desfeita.`)) return;
    try { await deleteCustomTheme.mutateAsync(t.id); toast.success('Tema excluído'); }
    catch { toast.error('Erro ao excluir tema'); }
  };
  const deleteFixedTheme = async (theme: NewsTheme, label: string) => {
    if (!confirm(`O tema "${label}" é parte do sistema e não pode ser apagado de fato. Deseja ocultá-lo da listagem? (pode ser revertido depois)`)) return;
    await toggleHidden(theme, true);
  };
  const startEditFeed = (f: RssFeed) => {
    setEditingFeedId(f.id);
    setFeedDraft({ name: f.name, feed_url: f.feed_url || '' });
  };
  const saveFeed = async (f: RssFeed) => {
    if (!feedDraft.name.trim()) { toast.error('Nome obrigatório.'); return; }
    if (!feedDraft.feed_url.trim()) { toast.error('URL obrigatória.'); return; }
    try {
      await updateFeed.mutateAsync({
        id: f.id, name: feedDraft.name.trim(), feed_url: feedDraft.feed_url.trim(),
      });
      toast.success('Feed atualizado');
      setEditingFeedId(null);
    } catch { toast.error('Erro ao salvar feed'); }
  };
  const toggleActive = async (f: RssFeed, v: boolean) => {
    try { await updateFeed.mutateAsync({ id: f.id, is_active: v }); }
    catch { toast.error('Erro ao alterar status'); }
  };
  const removeFeed = async (f: RssFeed) => {
    if (!confirm(`Excluir o feed "${f.name}"?`)) return;
    try { await deleteFeed.mutateAsync(f.id); toast.success('Feed removido'); }
    catch { toast.error('Erro ao remover'); }
  };
  const validateFeedUrl = async (id: string, url: string) => {
    if (!url.trim()) return;
    setValidatingId(id);
    try {
      const { data, error } = await supabase.functions.invoke('parse-rss', { body: { url } });
      if (error) throw error;
      const count = (data?.items as any[])?.length || 0;
      toast.success(`Feed válido — ${count} notícias`);
    } catch { toast.error('Não foi possível validar o feed.'); }
    finally { setValidatingId(null); }
  };

  const createNewFeed = async () => {
    if (!newFeed.name.trim() || !newFeed.feed_url.trim()) {
      toast.error('Nome e URL obrigatórios.'); return;
    }
    try {
      let items: RssFeedItem[] = [];
      try {
        const { data, error } = await supabase.functions.invoke('parse-rss', {
          body: { url: newFeed.feed_url.trim() },
        });
        if (!error && data?.items) items = data.items as RssFeedItem[];
      } catch { /* ignore parse errors */ }
      const maxOrder = feeds.reduce((m, f) => Math.max(m, f.display_order), 0);
      await createFeed.mutateAsync({
        name: newFeed.name.trim(),
        feed_url: newFeed.feed_url.trim(),
        themes: newFeed.themes,
        is_active: true,
        items,
        display_order: maxOrder + 1,
      });
      toast.success('Feed criado');
      setShowNew(false);
      setNewFeed({ name: '', feed_url: '', themes: [] });
    } catch { toast.error('Erro ao criar feed'); }
  };

  const toggleFeedTheme = async (feed: RssFeed, theme: NewsTheme, add: boolean) => {
    const current = feed.themes || [];
    const next = add
      ? Array.from(new Set([...current, theme]))
      : current.filter((t) => t !== theme);
    try { await updateFeed.mutateAsync({ id: feed.id, themes: next }); }
    catch { toast.error('Erro ao atualizar feed'); }
  };

  const toggleNewFeedTheme = (theme: NewsTheme) => {
    setNewFeed((d) => ({
      ...d,
      themes: d.themes.includes(theme) ? d.themes.filter((t) => t !== theme) : [...d.themes, theme],
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col overflow-hidden p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="text-sm flex items-center gap-2">
            <Tags className="h-4 w-4 text-primary" />
            Gerenciar temas e feeds
            <span className="ml-1 text-xs text-muted-foreground font-normal">
              {NEWS_THEMES.length} temas · {feeds.length} feeds
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* ============ Feeds section ============ */}
          <section className="rounded-lg border border-border bg-card">
            <button
              onClick={() => setFeedsOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent/30 transition-colors"
            >
              {feedsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <Rss className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold">Feeds RSS</span>
              <span className="text-[11px] text-muted-foreground ml-1">({feeds.length})</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {feeds.filter((f) => f.is_active).length} ativos
              </span>
            </button>

            {feedsOpen && (
              <div className="border-t border-border px-3 py-3 space-y-2">
                {feeds.map((f) => {
                  const isEditing = editingFeedId === f.id;
                  return (
                    <div key={f.id} className="rounded border border-border bg-background p-2.5 space-y-2">
                      {!isEditing ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium truncate">{f.name}</span>
                              {!f.is_active && <span className="text-[9px] uppercase text-muted-foreground">inativo</span>}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate font-mono">{f.feed_url || '—'}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(f.themes || []).length === 0 && (
                                <span className="text-[10px] text-muted-foreground/60 italic">sem temas</span>
                              )}
                              {(f.themes || []).map((th) => (
                                <span key={th} className={cn('rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider border', themeChipClass(th))}>
                                  {resolveLabel(th, overrides)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Switch
                              checked={f.is_active}
                              onCheckedChange={(v) => toggleActive(f, v)}
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditFeed(f)} title="Editar">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => removeFeed(f)} title="Excluir">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome</Label>
                              <Input
                                value={feedDraft.name}
                                onChange={(e) => setFeedDraft((d) => ({ ...d, name: e.target.value }))}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">URL RSS</Label>
                              <div className="flex gap-1 mt-1">
                                <Input
                                  value={feedDraft.feed_url}
                                  onChange={(e) => setFeedDraft((d) => ({ ...d, feed_url: e.target.value }))}
                                  className="h-8 text-xs flex-1" type="url"
                                />
                                <Button
                                  type="button" variant="outline" size="sm" className="h-8 px-2"
                                  onClick={() => validateFeedUrl(f.id, feedDraft.feed_url)}
                                  disabled={!feedDraft.feed_url.trim() || validatingId === f.id}
                                >
                                  {validatingId === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setEditingFeedId(null)}>Cancelar</Button>
                            <Button size="sm" className="h-7 text-[11px]" onClick={() => saveFeed(f)} disabled={updateFeed.isPending}>
                              {updateFeed.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Salvar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* New feed */}
                {showNew ? (
                  <div className="rounded border border-dashed border-primary/40 bg-primary/5 p-2.5 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome</Label>
                        <Input
                          value={newFeed.name}
                          onChange={(e) => setNewFeed((d) => ({ ...d, name: e.target.value }))}
                          placeholder="Bloomberg, InfoMoney…"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">URL RSS</Label>
                        <Input
                          value={newFeed.feed_url}
                          onChange={(e) => setNewFeed((d) => ({ ...d, feed_url: e.target.value }))}
                          placeholder="https://exemplo.com/rss.xml"
                          className="h-8 text-xs mt-1" type="url"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Temas</Label>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {NEWS_THEMES.map((t) => {
                          const active = newFeed.themes.includes(t.value);
                          return (
                            <button
                              key={t.value} type="button"
                              onClick={() => toggleNewFeedTheme(t.value)}
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border transition-opacity',
                                themeChipClass(t.value),
                                !active && 'opacity-40 hover:opacity-70',
                              )}
                            >
                              {resolveLabel(t.value, overrides)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => { setShowNew(false); setNewFeed({ name: '', feed_url: '', themes: [] }); }}>Cancelar</Button>
                      <Button size="sm" className="h-7 text-[11px]" onClick={createNewFeed} disabled={createFeed.isPending}>
                        {createFeed.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Criar feed
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowNew(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Adicionar feed
                  </Button>
                )}
              </div>
            )}
          </section>

          {/* ============ Custom Themes section ============ */}
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                Temas customizados ({customThemes.length})
              </h3>
              {!showNewTheme && (
                <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setShowNewTheme(true)}>
                  <Plus className="h-3 w-3 mr-1" />Novo tema
                </Button>
              )}
            </div>

            {showNewTheme && (
              <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome do tema</Label>
                    <Input
                      autoFocus
                      value={newThemeLabel}
                      onChange={(e) => setNewThemeLabel(e.target.value)}
                      placeholder="Ex: Energia, ESG, China…"
                      className="h-8 text-xs mt-1"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCustomTheme(); }}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cor</Label>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {CUSTOM_THEME_COLORS.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setNewThemeColor(c.key)}
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border transition-all',
                            c.chipClass,
                            newThemeColor === c.key ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'opacity-60 hover:opacity-100',
                          )}
                          title={c.label}
                        >
                          ●
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => { setShowNewTheme(false); setNewThemeLabel(''); }}>Cancelar</Button>
                  <Button size="sm" className="h-7 text-[11px]" onClick={handleCreateCustomTheme} disabled={createCustomTheme.isPending}>
                    {createCustomTheme.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Criar tema
                  </Button>
                </div>
              </div>
            )}

            {customThemes.length === 0 && !showNewTheme && (
              <p className="text-[11px] text-muted-foreground italic px-1">
                Nenhum tema customizado. Clique em "Novo tema" para criar um.
              </p>
            )}

            {customThemes.map((t) => {
              const isEd = editingCustomId === t.id;
              return (
                <div key={t.id} className="rounded-lg border border-border bg-card px-3 py-2">
                  {!isEd ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-[10px] font-medium', customThemeChipClass(t.color_key))}>
                        {t.label}
                      </Badge>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">custom</span>
                      <div className="ml-auto flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditCustom(t)} title="Editar">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeCustom(t)}
                          title="Excluir tema"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome</Label>
                          <Input
                            value={customDraft.label}
                            onChange={(e) => setCustomDraft((d) => ({ ...d, label: e.target.value }))}
                            className="h-8 text-xs mt-1"
                            autoFocus
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cor</Label>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {CUSTOM_THEME_COLORS.map((c) => (
                              <button
                                key={c.key}
                                type="button"
                                onClick={() => setCustomDraft((d) => ({ ...d, color_key: c.key }))}
                                className={cn(
                                  'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border transition-all',
                                  c.chipClass,
                                  customDraft.color_key === c.key ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'opacity-60 hover:opacity-100',
                                )}
                                title={c.label}
                              >
                                ●
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setEditingCustomId(null)}>Cancelar</Button>
                        <Button size="sm" className="h-7 text-[11px]" onClick={() => saveCustom(t)} disabled={updateCustomTheme.isPending}>
                          {updateCustomTheme.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Salvar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* ============ Fixed Themes section ============ */}
          <section className="space-y-2">
            <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-1">
              Temas do sistema
            </h3>

            {(() => {
              const orderedThemes = getOrderedThemes(overrides, true);
              return orderedThemes.map((theme, idx) => {
                const label = resolveLabel(theme, overrides);
                const isCustom = !!overrides?.labels?.[theme];
                const isHidden = !!overrides?.hidden?.[theme];
                const isEditing = editing === theme;
                const isOpen = expanded === theme;
                const themeFeeds = feedsByTheme[theme] || [];
                const otherFeeds = feeds.filter((f) => !(f.themes || []).includes(theme));
                const canMoveUp = idx > 0;
                const canMoveDown = idx < orderedThemes.length - 1;

                return (
                <div key={theme} className={cn('rounded-lg border border-border bg-card', isHidden && 'opacity-60')}>
                  <div className="flex items-center gap-1 px-3 py-2">
                    <div className="flex flex-col -ml-1 mr-1">
                      <button
                        onClick={() => moveTheme(theme, -1)}
                        disabled={!canMoveUp || setOrder.isPending}
                        className="h-3 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20"
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveTheme(theme, 1)}
                        disabled={!canMoveDown || setOrder.isPending}
                        className="h-3 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] font-medium', themeChipClass(theme))}>
                      {label}
                    </Badge>
                    {isCustom && <span className="text-[9px] uppercase tracking-wider text-muted-foreground">custom</span>}
                    {isHidden && <span className="text-[9px] uppercase tracking-wider text-destructive/70">oculto</span>}
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {themeFeeds.length} {themeFeeds.length === 1 ? 'feed' : 'feeds'}
                    </span>
                    {!isEditing && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleHidden(theme, !isHidden)} title={isHidden ? 'Exibir tema' : 'Ocultar tema'}>
                          {isHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditTheme(theme)} title="Editar nome">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteFixedTheme(theme, label)}
                          title="Excluir tema (oculta da listagem)"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        {isCustom && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => resetToDefault(theme)} title="Restaurar nome padrão">
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setExpanded(isOpen ? null : theme)}>
                          {isOpen ? 'Fechar' : 'Feeds'}
                        </Button>
                      </>
                    )}
                  </div>

                  {isEditing && (
                    <div className="px-3 pb-3 flex items-center gap-2">
                      <div className="flex-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Novo nome</Label>
                        <Input
                          value={draftLabel}
                          onChange={(e) => setDraftLabel(e.target.value)}
                          className="h-8 text-xs mt-1" autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') setEditing(null); }}
                        />
                      </div>
                      <Button size="icon" className="h-8 w-8 mt-5" onClick={saveLabel} disabled={upsertLabel.isPending}>
                        {upsertLabel.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 mt-5" onClick={() => setEditing(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  {isOpen && !isEditing && (
                    <div className="border-t border-border px-3 py-3 space-y-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                          Feeds neste tema ({themeFeeds.length})
                        </div>
                        {themeFeeds.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground italic">Nenhum feed associado.</p>
                        ) : (
                          <div className="space-y-1">
                            {themeFeeds.map((f) => (
                              <div key={f.id} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-background border border-border">
                                <span className="flex-1 truncate">{f.name}</span>
                                {!f.is_active && <span className="text-[9px] uppercase text-muted-foreground">inativo</span>}
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive"
                                  onClick={() => toggleFeedTheme(f, theme, false)}
                                  disabled={updateFeed.isPending} title="Remover deste tema">
                                  <Minus className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                          Adicionar feed ({otherFeeds.length} disponíveis)
                        </div>
                        {otherFeeds.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground italic">Todos os feeds já estão neste tema.</p>
                        ) : (
                          <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                            {otherFeeds.map((f) => (
                              <div key={f.id} className="flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-accent">
                                <span className="flex-1 truncate text-muted-foreground">{f.name}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-primary"
                                  onClick={() => toggleFeedTheme(f, theme, true)}
                                  disabled={updateFeed.isPending} title="Adicionar a este tema">
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
              });
            })()}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
