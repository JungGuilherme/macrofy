import { useState, useEffect } from 'react';
import { Search, Keyboard, User, Bell, LogOut, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useLang } from '@/contexts/LanguageContext';

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin/Research',
  aai: 'AAI',
  cliente: 'Cliente',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-accent text-accent-foreground',
  aai: 'bg-primary text-primary-foreground',
  cliente: 'bg-muted text-muted-foreground',
};

const shortcuts = [
  { key: '/', description: 'Abrir busca global' },
  { key: 'G H', description: 'Ir para Home' },
  { key: 'G D', description: 'Ir para Visão Global' },
  { key: 'G R', description: 'Ir para Recomendações' },
  { key: 'G L', description: 'Ir para Relatórios' },
  { key: 'F', description: 'Favoritar item (em detalhes)' },
  { key: 'Esc', description: 'Fechar modais' },
];

export function AppHeader() {
  const { sidebarCollapsed } = useApp();
  const { role, profile, signOut } = useAuth();
  const { lang, toggleLang } = useLang();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let gPressed = false;
    let gTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setSearchOpen(false);
        return;
      }

      if (e.key === '/' && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (e.key.toLowerCase() === 'g') {
        gPressed = true;
        gTimeout = setTimeout(() => (gPressed = false), 500);
        return;
      }

      if (gPressed) {
        clearTimeout(gTimeout);
        gPressed = false;
        switch (e.key.toLowerCase()) {
          case 'h': navigate('/'); break;
          case 'd': navigate('/macro'); break;
          case 'r': navigate('/recomendacoes'); break;
          case 'l': navigate('/relatorios'); break;
        }
      }

      if (e.key === '?') setShowShortcuts(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, searchOpen]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 right-0 h-14 bg-card border-b border-border flex items-center justify-between px-6 z-40 transition-all duration-300',
          sidebarCollapsed ? 'left-16' : 'left-64'
        )}
      >
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar recomendações, relatórios, artigos..."
              className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs text-muted-foreground bg-muted rounded">
              /
            </kbd>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            {lang === "pt" ? "EN" : "PT"}
          </button>

          <ThemeSwitcher />

          <div className="text-right hidden md:block">
            <p className="text-xs font-medium text-foreground">{formatTime(currentTime)}</p>
            <p className="text-[10px] text-muted-foreground">{formatDate(currentTime)}</p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowShortcuts(true)}
            className="text-muted-foreground hover:text-foreground h-8 w-8"
          >
            <Keyboard className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground relative h-8 w-8"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn('gap-2 px-3 h-8', roleColors[role])}
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">{profile?.name || roleLabels[role]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{profile?.name || 'Usuário'}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {roleLabels[role]}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atalhos de Teclado</DialogTitle>
            <DialogDescription>
              Use estes atalhos para navegar mais rapidamente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">{shortcut.key}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
