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
import { Loader2, FileText, ExternalLink, Plus, X, Upload } from 'lucide-react';
import { Report } from '@/hooks/useReports';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { PdfUpload } from '@/components/common/PdfUpload';

interface MaterialItem {
  label: string;
  url: string;
  type: string;
}

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  subtitle: z.string().max(300).optional().nullable(),
  type: z.string().min(1, 'Tipo é obrigatório'),
  theme: z.string().max(100).optional().nullable(),
  author: z.string().max(100).optional().nullable(),
  summary: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  is_published: z.boolean().optional().nullable(),
  pdf_url: z.string().url('URL inválida').or(z.literal('')).optional().nullable(),
  external_url: z.string().url('URL inválida').or(z.literal('')).optional().nullable(),
  content_html: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface ReportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report?: Report | null;
  onSubmit: (data: FormData & { materials?: MaterialItem[] }) => Promise<void>;
  isLoading?: boolean;
}

const reportTypes = [
  { value: 'carta_mensal', label: 'Carta Mensal' },
  { value: 'relatorio', label: 'Relatório' },
  { value: 'morning_call', label: 'Morning Call' },
  { value: 'nota', label: 'Nota' },
];

const themes = [
  'Macroeconômico',
  'Renda Variável',
  'Renda Fixa',
  'Fundos',
  'Internacional',
  'Setorial',
  'Estratégia',
];

export function ReportForm({
  open,
  onOpenChange,
  report,
  onSubmit,
  isLoading,
}: ReportFormProps) {
  const [tagsInput, setTagsInput] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      subtitle: '',
      type: 'relatorio',
      theme: '',
      author: '',
      summary: '',
      tags: [],
      is_published: true,
      pdf_url: '',
      external_url: '',
      content_html: '',
    },
  });

  useEffect(() => {
    if (report) {
      const rep = report as any;
      form.reset({
        title: report.title || '',
        subtitle: rep.subtitle || '',
        type: report.type || 'relatorio',
        theme: report.theme || '',
        author: report.author || '',
        summary: report.summary || '',
        tags: report.tags || [],
        is_published: report.is_published ?? true,
        pdf_url: report.pdf_url || '',
        external_url: rep.external_url || '',
        content_html: rep.content_html || '',
      });
      setTagsInput((report.tags || []).join(', '));
      setContentHtml(rep.content_html || '');
      setMaterials(Array.isArray(rep.materials) ? rep.materials : []);
    } else {
      form.reset({
        title: '',
        subtitle: '',
        type: 'relatorio',
        theme: '',
        author: '',
        summary: '',
        tags: [],
        is_published: true,
        pdf_url: '',
        external_url: '',
        content_html: '',
      });
      setTagsInput('');
      setContentHtml('');
      setMaterials([]);
    }
  }, [report, form, open]);

  const handleSubmit = async (data: FormData) => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await onSubmit({ 
      ...data, 
      tags, 
      pdf_url: data.pdf_url || null,
      external_url: data.external_url || null,
      content_html: contentHtml || null,
      materials: materials.filter(m => m.label && m.url),
    });
  };

  const addMaterial = () => {
    setMaterials([...materials, { label: '', url: '', type: 'link' }]);
  };

  const updateMaterial = (index: number, field: keyof MaterialItem, value: string) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const isEditing = !!report;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Relatório/Carta' : 'Novo Relatório/Carta'}
          </DialogTitle>
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
                    <Input placeholder="Título do documento" {...field} />
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
                  <FormLabel>Subtítulo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Subtítulo ou resumo breve"
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {reportTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tema</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {themes.map((theme) => (
                          <SelectItem key={theme} value={theme}>
                            {theme}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                placeholder="Ex: janeiro, macro, cenário"
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
                currentUrl={form.watch('pdf_url') || null}
                onUploaded={(url) => form.setValue('pdf_url', url)}
                onRemoved={() => form.setValue('pdf_url', '')}
                folder="reports"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pdf_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Ou cole o link do PDF
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://exemplo.com/relatorio.pdf"
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
                        placeholder="https://exemplo.com/relatorio"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Materials Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Materiais Adicionais</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              {materials.map((material, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    placeholder="Nome do material"
                    value={material.label}
                    onChange={(e) => updateMaterial(index, 'label', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="URL"
                    value={material.url}
                    onChange={(e) => updateMaterial(index, 'url', e.target.value)}
                    className="flex-1"
                  />
                  <Select
                    value={material.type}
                    onValueChange={(v) => updateMaterial(index, 'type', v)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMaterial(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {materials.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum material adicional</p>
              )}
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
                {isEditing ? 'Salvar Alterações' : 'Criar Documento'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
