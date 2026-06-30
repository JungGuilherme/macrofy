import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { HouseAlert, AlertType, TimeHint } from '@/hooks/useHouseAlerts';

const schema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  type: z.enum(['attention', 'content', 'event', 'market']),
  url: z.string().optional(),
  time_hint: z.enum(['hoje', 'amanha', 'semana']).nullable().optional(),
  is_pinned: z.boolean(),
  is_active: z.boolean(),
  expires_at: z.date().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

interface HouseAlertFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert?: HouseAlert | null;
  onSubmit: (data: Omit<FormData, 'expires_at'> & { expires_at?: string | null }) => Promise<void>;
  isLoading?: boolean;
}

const typeOptions: { value: AlertType; label: string }[] = [
  { value: 'attention', label: '⚠️ Atenção (laranja)' },
  { value: 'content', label: '📄 Conteúdo (verde)' },
  { value: 'event', label: '📅 Evento (azul)' },
  { value: 'market', label: '📈 Mercado (neutro)' },
];

const timeHintOptions: { value: TimeHint; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'amanha', label: 'Amanhã' },
  { value: 'semana', label: 'Esta semana' },
];

export function HouseAlertForm({
  open,
  onOpenChange,
  alert,
  onSubmit,
  isLoading,
}: HouseAlertFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: alert?.title || '',
      type: alert?.type || 'content',
      url: alert?.url || '',
      time_hint: alert?.time_hint || null,
      is_pinned: alert?.is_pinned || false,
      is_active: alert?.is_active ?? true,
      expires_at: alert?.expires_at ? new Date(alert.expires_at) : null,
    },
  });

  // Reset form when alert changes
  const handleOpenChange = (open: boolean) => {
    if (open) {
      form.reset({
        title: alert?.title || '',
        type: alert?.type || 'content',
        url: alert?.url || '',
        time_hint: alert?.time_hint || null,
        is_pinned: alert?.is_pinned || false,
        is_active: alert?.is_active ?? true,
        expires_at: alert?.expires_at ? new Date(alert.expires_at) : null,
      });
    }
    onOpenChange(open);
  };

  const handleSubmit = async (data: FormData) => {
    await onSubmit({
      ...data,
      expires_at: data.expires_at ? data.expires_at.toISOString().split('T')[0] : null,
    });
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {alert?.id ? 'Editar Alerta' : 'Novo Alerta'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto (permite emojis)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 🔥 COPOM decide Selic às 18h" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {typeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
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
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="/recomendacoes/xyz ou https://..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="time_hint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contexto de tempo (opcional)</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {timeHintOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
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
              name="expires_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expira em (opcional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                          ) : (
                            <span>Sem data de expiração</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={(date) => field.onChange(date || null)}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                      {field.value && (
                        <div className="border-t p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => field.onChange(null)}
                          >
                            Remover data
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Após essa data, o aviso some automaticamente.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="is_pinned"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">📌 Fixar no topo</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">Ativo</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : alert?.id ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
