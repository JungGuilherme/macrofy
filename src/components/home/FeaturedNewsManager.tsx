import { useState } from 'react';
import { useRssFeeds, useUpdateRssFeed, RssFeedItem } from '@/hooks/useRssFeeds';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Flame, Plus, Trash2, Loader2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

const DESTAQUE_THEME = 'Notícias Destaque';

export function FeaturedNewsManager() {
  const { data: feeds = [] } = useRssFeeds();
  const updateFeed = useUpdateRssFeed();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [source, setSource] = useState('');
  const [editingGuid, setEditingGuid] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editSource, setEditSource] = useState('');

  const destaqueFeed = feeds.find((f) => f.theme === DESTAQUE_THEME);
  const items: RssFeedItem[] = destaqueFeed?.items || [];

  const handleAdd = async () => {
    if (!title.trim() || !destaqueFeed) return;

    const newItem: RssFeedItem = {
      guid: `manual-${Date.now()}`,
      title: title.trim(),
      description: '',
      link: link.trim(),
      pubDate: new Date().toISOString(),
      creators: [],
      sourceName: source.trim() || 'Destaque',
    };

    try {
      await updateFeed.mutateAsync({
        id: destaqueFeed.id,
        items: [newItem, ...items],
      });
      setTitle('');
      setLink('');
      setSource('');
      toast.success('Notícia adicionada');
    } catch {
      toast.error('Erro ao adicionar');
    }
  };

  const handleRemove = async (guid: string) => {
    if (!destaqueFeed) return;
    try {
      await updateFeed.mutateAsync({
        id: destaqueFeed.id,
        items: items.filter((i) => i.guid !== guid),
      });
      toast.success('Notícia removida');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const startEdit = (item: RssFeedItem) => {
    setEditingGuid(item.guid);
    setEditTitle(item.title);
    setEditLink(item.link);
    setEditSource(item.sourceName || '');
  };

  const cancelEdit = () => {
    setEditingGuid(null);
  };

  const saveEdit = async () => {
    if (!destaqueFeed || !editingGuid || !editTitle.trim()) return;
    try {
      await updateFeed.mutateAsync({
        id: destaqueFeed.id,
        items: items.map((i) =>
          i.guid === editingGuid
            ? { ...i, title: editTitle.trim(), link: editLink.trim(), sourceName: editSource.trim() || 'Destaque' }
            : i
        ),
      });
      setEditingGuid(null);
      toast.success('Notícia atualizada');
    } catch {
      toast.error('Erro ao atualizar');
    }
  };

  if (!destaqueFeed) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <Flame className="h-3.5 w-3.5 mr-1.5" />
          Gerenciar Destaques
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Flame className="h-4 w-4 text-primary" />
            Notícias Destaque
          </DialogTitle>
        </DialogHeader>

        {/* Add form */}
        <div className="space-y-1.5 border border-border rounded-lg p-2.5 bg-muted/20 flex-shrink-0">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Label htmlFor="dest-title" className="text-[10px]">Título</Label>
              <Input id="dest-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título..." className="h-7 text-xs" />
            </div>
            <div>
              <Label htmlFor="dest-source" className="text-[10px]">Fonte</Label>
              <Input id="dest-source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Bloomberg..." className="h-7 text-xs" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className="h-7 text-xs flex-1" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            <Button size="sm" className="h-7 text-xs px-3" onClick={handleAdd} disabled={!title.trim() || updateFeed.isPending}>
              {updateFeed.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Items list */}
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">Nenhuma notícia em destaque</p>
        ) : (
          <div className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-1">
            {items.map((item) => (
              <div key={item.guid} className="p-1.5 rounded border border-border bg-card">
                {editingGuid === item.guid ? (
                  <div className="space-y-1">
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-7 text-xs" placeholder="Título" />
                    <div className="flex gap-1">
                      <Input value={editSource} onChange={(e) => setEditSource(e.target.value)} className="h-7 text-xs flex-1" placeholder="Fonte" />
                      <Input value={editLink} onChange={(e) => setEditLink(e.target.value)} className="h-7 text-xs flex-[2]" placeholder="Link" />
                    </div>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}><X className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={saveEdit} disabled={updateFeed.isPending}><Check className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                      <span className="text-[10px] text-muted-foreground">{item.sourceName}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0 opacity-60 hover:opacity-100" onClick={() => startEdit(item)}>
                      <Pencil className="h-2.5 w-2.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive/60 hover:text-destructive flex-shrink-0" onClick={() => handleRemove(item.guid)} disabled={updateFeed.isPending}>
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
