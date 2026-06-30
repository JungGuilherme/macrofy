import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Star } from 'lucide-react';
import { ThemeMultiSelect } from './ThemeMultiSelect';
import {
  CuratedNews, useCreateCuratedNews, useUpdateCuratedNews,
} from '@/hooks/useCuratedNews';
import type { NewsTheme } from '@/lib/newsThemes';
import { toast } from 'sonner';

interface ManualNewsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: CuratedNews | null;
}

function toLocalInput(d: Date): string {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

export function ManualNewsDrawer({ open, onOpenChange, editing }: ManualNewsDrawerProps) {
  const createMut = useCreateCuratedNews();
  const updateMut = useUpdateCuratedNews();

  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [themes, setThemes] = useState<NewsTheme[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [publishedLocal, setPublishedLocal] = useState(toLocalInput(new Date()));

  useEffect(() => {
    if (open) {
      if (editing) {
        setTitle(editing.title);
        setSource(editing.source || '');
        setExternalUrl(editing.external_url);
        setSummary(editing.summary || '');
        setImageUrl(editing.image_url || '');
        setThemes(editing.themes || []);
        setIsFeatured(!!editing.is_featured);
        setIsActive(editing.is_active);
        const d = new Date(editing.published_at || editing.published_date);
        setPublishedLocal(isNaN(d.getTime()) ? toLocalInput(new Date()) : toLocalInput(d));
      } else {
        setTitle(''); setSource(''); setExternalUrl(''); setSummary(''); setImageUrl('');
        setThemes([]); setIsFeatured(false); setIsActive(true);
        setPublishedLocal(toLocalInput(new Date()));
      }
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Título é obrigatório'); return; }
    if (!externalUrl.trim()) { toast.error('Link externo é obrigatório'); return; }

    const payload = {
      title: title.trim(),
      external_url: externalUrl.trim(),
      source: source.trim() || null,
      summary: summary.trim() || null,
      image_url: imageUrl.trim() || null,
      themes,
      is_featured: isFeatured,
      is_active: isActive,
      published_at: new Date(publishedLocal).toISOString(),
    };

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload } as any);
      } else {
        await createMut.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // toast handled by mutation
    }
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col overflow-hidden p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="text-sm">
            {editing ? 'Editar notícia' : 'Adicionar notícia'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 mt-1 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fonte</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} className="h-8 mt-1 text-xs" placeholder="Bloomberg, Editorial…" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Data/Hora</Label>
              <Input
                type="datetime-local"
                value={publishedLocal}
                onChange={(e) => setPublishedLocal(e.target.value)}
                className="h-8 mt-1 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Link externo *</Label>
            <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} type="url" placeholder="https://…" className="h-8 mt-1 text-xs" />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Resumo (opcional)</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="text-xs mt-1" />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Imagem (URL, opcional)</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} type="url" placeholder="https://…" className="h-8 mt-1 text-xs" />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Temas</Label>
            <div className="mt-1">
              <ThemeMultiSelect value={themes} onChange={setThemes} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center justify-between gap-2 px-3 py-2 rounded border border-border bg-background cursor-pointer">
              <span className="flex items-center gap-2 text-xs">
                <Star className={`h-3.5 w-3.5 ${isFeatured ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                Destaque
              </span>
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            </label>
            <label className="flex items-center justify-between gap-2 px-3 py-2 rounded border border-border bg-background cursor-pointer">
              <span className="text-xs">{isActive ? 'Ativa' : 'Inativa'}</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
          </div>
        </div>

        <SheetFooter className="px-5 py-3 border-t border-border flex-row gap-2 sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {editing ? 'Salvar' : 'Adicionar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
