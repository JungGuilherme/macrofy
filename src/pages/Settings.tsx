import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { User, Bell, Palette, Keyboard, Sun, Moon, Monitor, MessageCircleQuestion, Check, Trash2, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme, Theme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FeedbackItem {
  id: string;
  user_id: string;
  user_name: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const themeOptions: { value: Theme; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Claro', description: 'Estilo editorial WSJ/FT com fundo claro', icon: <Sun className="h-5 w-5" /> },
  { value: 'dark', label: 'Escuro', description: 'Tema escuro com alto contraste', icon: <Moon className="h-5 w-5" /> },
  { value: 'bloomberg', label: 'Bloomberg', description: 'Terminal estilo Bloomberg', icon: <Monitor className="h-5 w-5" /> },
];

function FeedbackSection() {
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['feedback-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_suggestions' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as FeedbackItem[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('feedback_suggestions' as any).update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback-suggestions'] }),
  });

  const deleteFeedback = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('feedback_suggestions' as any).delete().eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback-suggestions'] }),
  });

  const unreadCount = items.filter((i) => !i.is_read).length;

  return (
    <div className="bg-card rounded-xl border p-6">
      <div className="flex items-center gap-3 mb-4">
        <MessageCircleQuestion className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Sugestões e Feedback</h2>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="text-xs">{unreadCount} nova{unreadCount > 1 ? 's' : ''}</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Nenhuma sugestão recebida ainda.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'rounded-lg border p-3 sm:p-4 transition-colors',
                !item.is_read ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs sm:text-sm font-semibold text-foreground">{item.subject}</span>
                    {!item.is_read && <Badge className="text-[10px] px-1.5 py-0">Nova</Badge>}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">{item.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                    <span>{item.user_name || 'Usuário'}</span>
                    <span>·</span>
                    <span>{format(new Date(item.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!item.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Marcar como lida"
                      onClick={() => markRead.mutate(item.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    title="Excluir"
                    onClick={() => deleteFeedback.mutate(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        subtitle="Preferências do portal"
        breadcrumbs={[{ label: 'Configurações' }]}
      />

      <div className="max-w-2xl space-y-4 sm:space-y-6">
        {/* Admin: Feedback/Suggestions */}
        {isAdmin && <FeedbackSection />}

        {/* Profile */}
        <div className="bg-card rounded-xl border p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Perfil</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            As configurações de perfil estarão disponíveis após a integração com autenticação.
          </p>
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-xl border p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Notificações</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify-new">Novas recomendações</Label>
                <p className="text-sm text-muted-foreground">Receber alertas de novas recomendações</p>
              </div>
              <Switch id="notify-new" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify-updates">Atualizações de status</Label>
                <p className="text-sm text-muted-foreground">Alertas quando recomendações mudam de status</p>
              </div>
              <Switch id="notify-updates" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify-reports">Novos relatórios</Label>
                <p className="text-sm text-muted-foreground">Notificar quando novos relatórios forem publicados</p>
              </div>
              <Switch id="notify-reports" />
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="bg-card rounded-xl border p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Tema</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {themeOptions.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  'flex flex-row sm:flex-col items-center gap-2 p-3 sm:p-4 rounded-lg border-2 transition-all duration-200',
                  theme === t.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                )}
              >
                <span className={cn(
                  'text-muted-foreground',
                  theme === t.value && 'text-primary'
                )}>{t.icon}</span>
                <span className="text-sm font-medium text-foreground">{t.label}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{t.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-card rounded-xl border p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Aparência</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="compact-mode">Modo compacto</Label>
                <p className="text-sm text-muted-foreground">Reduzir espaçamento para mais informação na tela</p>
              </div>
              <Switch id="compact-mode" />
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="bg-card rounded-xl border p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Keyboard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Atalhos de Teclado</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Abrir busca</span>
              <kbd className="px-2 py-0.5 bg-muted rounded font-mono">/</kbd>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Ir para Home</span>
              <kbd className="px-2 py-0.5 bg-muted rounded font-mono">G H</kbd>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Ir para Dashboards</span>
              <kbd className="px-2 py-0.5 bg-muted rounded font-mono">G D</kbd>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Ir para Recomendações</span>
              <kbd className="px-2 py-0.5 bg-muted rounded font-mono">G R</kbd>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Fechar modais</span>
              <kbd className="px-2 py-0.5 bg-muted rounded font-mono">Esc</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
