import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { CuratedNews } from '@/hooks/useCuratedNews';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(300),
  external_url: z.string().url('URL inválida').or(z.literal('')).optional(),
  source: z.string().max(100).optional().nullable(),
  published_date: z.string().min(1, 'Data é obrigatória'),
  is_active: z.boolean(),
  content_html: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

// Get today's date as YYYY-MM-DD string in local timezone
function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface NewsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  news?: CuratedNews | null;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

export function NewsForm({
  open,
  onOpenChange,
  news,
  onSubmit,
  isLoading,
}: NewsFormProps) {
  const [contentHtml, setContentHtml] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      external_url: '',
      source: '',
      published_date: getLocalDateString(),
      is_active: true,
      content_html: '',
    },
  });

  useEffect(() => {
    if (news) {
      form.reset({
        title: news.title || '',
        external_url: news.external_url || '',
        source: news.source || '',
        published_date: news.published_date || getLocalDateString(),
        is_active: news.is_active ?? true,
        content_html: news.content_html || '',
      });
      setContentHtml(news.content_html || '');
    } else {
      form.reset({
        title: '',
        external_url: '',
        source: '',
        published_date: getLocalDateString(),
        is_active: true,
        content_html: '',
      });
      setContentHtml('');
    }
  }, [news, form, open]);

  const handleSubmit = async (data: FormData) => {
    await onSubmit({
      ...data,
      source: data.source || null,
      external_url: data.external_url || '',
      content_html: contentHtml || null,
    });
  };

  const isEditing = !!news;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Notícia' : 'Nova Notícia'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Título da notícia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fonte</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: InfoMoney"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="published_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Publicação *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="external_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Externa (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://exemplo.com/noticia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rich Text Editor */}
            <div className="space-y-2">
              <FormLabel>Conteúdo (opcional)</FormLabel>
              <RichTextEditor
                content={contentHtml}
                onChange={setContentHtml}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-sm font-medium">Ativo</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Criar Notícia'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
