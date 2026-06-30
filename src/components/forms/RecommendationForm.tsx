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
import { Loader2, FileText, ExternalLink } from 'lucide-react';
import { Recommendation } from '@/hooks/useRecommendations';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  product_code: z.string().max(50).optional().nullable(),
  category: z.string().min(1, 'Categoria é obrigatória'),
  status: z.string().min(1, 'Status é obrigatório'),
  risk_level: z.string().min(1, 'Nível de risco é obrigatório'),
  thesis: z.string().max(500).optional().nullable(),
  executive_summary: z.string().max(2000).optional().nullable(),
  risks: z.string().max(1000).optional().nullable(),
  client_explanation: z.string().max(2000).optional().nullable(),
  profile_fit: z.array(z.string()).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  is_published: z.boolean().optional().nullable(),
  file_url: z.string().url('URL inválida').or(z.literal('')).optional().nullable(),
  external_link: z.string().url('URL inválida').or(z.literal('')).optional().nullable(),
  content_html: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface RecommendationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation?: Recommendation | null;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

const categories = ['Ação', 'FII', 'Renda Fixa', 'Fundo', 'Internacional', 'Cripto'];
const statuses = [
  { value: 'em_oferta', label: 'Em Oferta' },
  { value: 'ativa', label: 'Ativa' },
  { value: 'monitoramento', label: 'Monitoramento' },
  { value: 'encerrada', label: 'Encerrada' },
];
const riskLevels = [
  { value: 'baixo', label: 'Baixo' },
  { value: 'medio', label: 'Médio' },
  { value: 'alto', label: 'Alto' },
];
const profiles = ['conservador', 'moderado', 'arrojado'];

export function RecommendationForm({
  open,
  onOpenChange,
  recommendation,
  onSubmit,
  isLoading,
}: RecommendationFormProps) {
  const [tagsInput, setTagsInput] = useState('');
  const [contentHtml, setContentHtml] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      product_code: '',
      category: 'Ação',
      status: 'ativa',
      risk_level: 'medio',
      thesis: '',
      executive_summary: '',
      risks: '',
      client_explanation: '',
      profile_fit: ['moderado'],
      tags: [],
      is_published: true,
      file_url: '',
      external_link: '',
      content_html: '',
    },
  });

  useEffect(() => {
    if (recommendation) {
      const rec = recommendation as any;
      form.reset({
        title: recommendation.title || '',
        product_code: recommendation.product_code || '',
        category: recommendation.category || 'Ação',
        status: recommendation.status || 'ativa',
        risk_level: recommendation.risk_level || 'medio',
        thesis: recommendation.thesis || '',
        executive_summary: recommendation.executive_summary || '',
        risks: recommendation.risks || '',
        client_explanation: recommendation.client_explanation || '',
        profile_fit: recommendation.profile_fit || ['moderado'],
        tags: recommendation.tags || [],
        is_published: recommendation.is_published ?? true,
        file_url: rec.file_url || '',
        external_link: rec.external_link || '',
        content_html: rec.content_html || '',
      });
      setTagsInput((recommendation.tags || []).join(', '));
      setContentHtml(rec.content_html || '');
    } else {
      form.reset({
        title: '',
        product_code: '',
        category: 'Ação',
        status: 'ativa',
        risk_level: 'medio',
        thesis: '',
        executive_summary: '',
        risks: '',
        client_explanation: '',
        profile_fit: ['moderado'],
        tags: [],
        is_published: true,
        file_url: '',
        external_link: '',
        content_html: '',
      });
      setTagsInput('');
      setContentHtml('');
    }
  }, [recommendation, form, open]);

  const handleSubmit = async (data: FormData) => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await onSubmit({ 
      ...data, 
      tags, 
      file_url: data.file_url || null,
      external_link: data.external_link || null,
      content_html: contentHtml || null,
    });
  };

  const isEditing = !!recommendation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Recomendação' : 'Nova Recomendação'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: PETR4 - Petrobras" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="product_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código/Ticker</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: PETR4" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
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
                name="risk_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Risco *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {riskLevels.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Rich Text Editor for main content */}
            <div className="space-y-2">
              <FormLabel>Conteúdo Principal</FormLabel>
              <RichTextEditor
                content={contentHtml}
                onChange={setContentHtml}
                editable={true}
              />
            </div>

            <div className="space-y-2">
              <FormLabel>Tags (separadas por vírgula)</FormLabel>
              <Input
                placeholder="Ex: dividendos, valor, longo prazo"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
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
                      Link do PDF
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://exemplo.com/documento.pdf"
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
                name="external_link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Link Externo
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://exemplo.com/pagina"
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
                {isEditing ? 'Salvar Alterações' : 'Criar Recomendação'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
