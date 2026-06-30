import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { parseRssXml, RssFeedItem } from '@/hooks/useRssFeeds';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RssFeedFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; items: RssFeedItem[]; feed_url?: string; theme?: string }) => Promise<void>;
  isLoading: boolean;
  initialName?: string;
  initialFeedUrl?: string;
  initialTheme?: string;
  mode: 'create' | 'edit';
  existingThemes?: string[];
}

export function RssFeedForm({ open, onOpenChange, onSubmit, isLoading, initialName = '', initialFeedUrl = '', initialTheme = '', mode, existingThemes = [] }: RssFeedFormProps) {
  const [name, setName] = useState(initialName);
  const [feedUrl, setFeedUrl] = useState(initialFeedUrl);
  const [theme, setTheme] = useState(initialTheme);
  const [parsing, setParsing] = useState(false);

  const handleOpen = (o: boolean) => {
    if (o) {
      setName(initialName);
      setFeedUrl(initialFeedUrl);
      setTheme(initialTheme);
    }
    onOpenChange(o);
  };

  const fetchAndParseUrl = async (url: string): Promise<RssFeedItem[]> => {
    // Try direct fetch first, fallback to edge function proxy
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Direct fetch failed');
      const xmlText = await response.text();
      return await parseRssXml(xmlText);
    } catch {
      // Fallback: use edge function to fetch (avoids CORS)
      const { data, error } = await supabase.functions.invoke('parse-rss', {
        body: { url },
      });
      if (error) throw error;
      return data.items as RssFeedItem[];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const resolvedTheme = theme.trim() || name.trim();

    if (mode === 'edit') {
      await onSubmit({ name: name.trim(), items: [], feed_url: feedUrl.trim() || undefined, theme: resolvedTheme });
      return;
    }

    if (!feedUrl.trim()) {
      toast({ title: 'Erro', description: 'Informe a URL do feed RSS.', variant: 'destructive' });
      return;
    }

    setParsing(true);
    try {
      const items = await fetchAndParseUrl(feedUrl.trim());

      if (items.length === 0) {
        toast({ title: 'Aviso', description: 'Nenhuma notícia encontrada no RSS.', variant: 'destructive' });
        setParsing(false);
        return;
      }
      await onSubmit({ name: name.trim(), items, feed_url: feedUrl.trim(), theme: resolvedTheme });
      toast({ title: 'Sucesso', description: `${items.length} notícias importadas.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao buscar o feed. Verifique se a URL está correta.', variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Adicionar Feed RSS' : 'Editar Feed RSS'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="feed-theme">Aba / Tema</Label>
            <Input
              id="feed-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex: Economia, Mercado, Cripto..."
              list="theme-suggestions"
            />
            <datalist id="theme-suggestions">
              {existingThemes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground mt-1">
              Feeds com o mesmo tema aparecem na mesma aba. Deixe vazio para usar o nome do feed.
            </p>
          </div>

          <div>
            <Label htmlFor="feed-name">Nome do feed / Fonte</Label>
            <Input
              id="feed-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: WSJ, InfoMoney, Bloomberg..."
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Este nome aparece como fonte nas notícias.
            </p>
          </div>

          <div>
            <Label htmlFor="feed-url-field">URL do feed RSS</Label>
            <Input
              id="feed-url-field"
              type="url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://exemplo.com/rss.xml"
              required={mode === 'create'}
            />
            <p className="text-xs text-muted-foreground mt-1">
              O feed será buscado e atualizado automaticamente a cada hora.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || parsing}>
              {(isLoading || parsing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'create'
                ? parsing
                  ? 'Buscando feed...'
                  : 'Importar'
                : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
