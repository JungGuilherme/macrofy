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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, ExternalLink, Upload } from 'lucide-react';
import { Article } from '@/hooks/useArticles';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { PdfUpload } from '@/components/common/PdfUpload';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  subtitle: z.string().max(300).optional().nullable(),
  body: z.string().max(50000).optional().nullable(),
  author: z.string().max(100).optional().nullable(),
  read_time: z.number().min(1).max(120).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  is_published: z.boolean().optional().nullable(),
  file_url: z.string().url('URL inválida').or(z.literal('')).optional().nullable(),
  external_url: z.string().url('URL inválida').or(z.literal('')).optional().nullable(),
  content_html: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface ArticleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: Article | null;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

export function ArticleForm({
  open,
  onOpenChange,
  article,
  onSubmit,
  isLoading,
}: ArticleFormProps) {
  const [tagsInput, setTagsInput] = useState('');
  const [contentHtml, setContentHtml] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      subtitle: '',
      body: '',
      author: '',
      read_time: 5,
      tags: [],
      is_published: true,
      file_url: '',
      external_url: '',
      content_html: '',
    },
  });

  useEffect(() => {
    if (article) {
      const art = article as any;
      form.reset({
        title: article.title || '',
        subtitle: article.subtitle || '',
        body: article.body || '',
        author: article.author || '',
        read_time: article.read_time || 5,
        tags: article.tags || [],
        is_published: article.is_published ?? true,
        file_url: art.file_url || '',
        external_url: art.external_url || '',
        content_html: art.content_html || '',
      });
      setTagsInput((article.tags || []).join(', '));
      setContentHtml(art.content_html || '');
    } else {
      form.reset({
        title: '',
        subtitle: '',
        body: '',
        author: '',
        read_time: 5,
        tags: [],
        is_published: true,
        file_url: '',
        external_url: '',
        content_html: '',
      });
      setTagsInput('');
      setContentHtml('');
    }
  }, [article, form, open]);

  const handleSubmit = async (data: FormData) => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await onSubmit({ 
      ...data, 
      tags, 
      file_url: data.file_url || null,
      external_url: data.external_url || null,
      content_html: contentHtml || null,
    });
  };

  const isEditing = !!article;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Artigo' : 'Novo Artigo'}</DialogTitle>
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
                    <Input placeholder="Título do artigo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subtitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtítulo / Resumo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Breve descrição do artigo"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Autor</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome do autor"
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
                name="read_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo de Leitura (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        {...field}
                        value={field.value || 5}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Rich Text Editor for content */}
            <div className="space-y-2">
              <FormLabel>Conteúdo</FormLabel>
              <RichTextEditor
                content={contentHtml}
                onChange={setContentHtml}
                editable={true}
              />
            </div>

            <div className="space-y-2">
              <FormLabel>Tags (separadas por vírgula)</FormLabel>
              <Input
                placeholder="Ex: mercado, análise, tutorial"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_published"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === 'true')}
                      value={field.value ? 'true' : 'false'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Publicado</SelectItem>
                        <SelectItem value="false">Rascunho</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* PDF Upload */}
            <div className="space-y-2">
              <FormLabel className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload de PDF
              </FormLabel>
              <PdfUpload
                currentUrl={form.watch('file_url') || null}
                onUploaded={(url) => form.setValue('file_url', url)}
                onRemoved={() => form.setValue('file_url', '')}
                folder="articles"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="file_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Ou cole o link do PDF
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://exemplo.com/artigo.pdf"
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
                name="external_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Link Externo
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://exemplo.com/artigo"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {isEditing ? 'Salvar Alterações' : 'Criar Artigo'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
