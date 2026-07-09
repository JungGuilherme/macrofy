import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import {
  Home,
  LayoutDashboard,
  FileText,
  Star,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BookOpen,
  Coffee,
  BarChart2,
  LineChart,
  Newspaper,
  Flag,
  Vote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  badge?: string;
  end?: boolean;
}

function NavItem({ to, icon, label, collapsed, badge, end }: NavItemProps) {
  const content = (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          'hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground',
          isActive && 'bg-sidebar-accent text-sidebar-foreground font-medium',
          collapsed && 'justify-center px-2'
        )
      }
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-sm">{label}</span>
          {badge && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-gold/20 text-gold">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {label}
          {badge && <span className="ml-2 text-gold">({badge})</span>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function SectionLabel({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  if (collapsed) {
    return <div className="mx-2 my-3 border-t border-sidebar-border" />;
  }
  return (
    <p className="px-3 pt-4 pb-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
      {children}
    </p>
  );
}

export function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useApp();
  const collapsed = sidebarCollapsed;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-sidebar flex flex-col transition-all duration-300 z-50',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border',
        collapsed && 'justify-center px-2'
      )}>
        {collapsed ? (
          <span className="text-sidebar-foreground font-bold text-lg" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
            MF
          </span>
        ) : (
          <div className="flex items-center gap-0">
            <span className="text-sidebar-foreground font-bold text-xl tracking-tight" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
              MF
            </span>
            <span className="text-sidebar-muted mx-2.5 text-lg font-light">|</span>
            <span className="text-sidebar-foreground font-semibold text-sm tracking-[0.15em] uppercase" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
              MACROFY
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Home" collapsed={collapsed} end />
        <NavItem to="/morning-call" icon={<Coffee className="h-5 w-5" />} label="Morning Call" collapsed={collapsed} />
        <NavItem to="/noticias" icon={<Newspaper className="h-5 w-5" />} label="Notícias" collapsed={collapsed} />

        <SectionLabel collapsed={collapsed}>Mercados & Macro</SectionLabel>
        <NavItem to="/mercados" icon={<BarChart2 className="h-5 w-5" />} label="Mercados" collapsed={collapsed} />
        <NavItem to="/brasil" icon={<Flag className="h-5 w-5" />} label="🇧🇷 Brasil" collapsed={collapsed} />
        <NavItem to="/eua" icon={<Flag className="h-5 w-5" />} label="🇺🇸 Estados Unidos" collapsed={collapsed} />
        <NavItem to="/macro" icon={<LayoutDashboard className="h-5 w-5" />} label="Visão Global" collapsed={collapsed} />
        <NavItem to="/tesouro-curvas" icon={<LineChart className="h-5 w-5" />} label="Curvas de Juros" collapsed={collapsed} />
        <NavItem to="/eleicoes-2026" icon={<Vote className="h-5 w-5" />} label="Eleições 2026" collapsed={collapsed} />

        <SectionLabel collapsed={collapsed}>Research</SectionLabel>
        <NavItem
          to="/recomendacoes"
          icon={<TrendingUp className="h-5 w-5" />}
          label="Recomendações"
          collapsed={collapsed}
        />
        <NavItem
          to="/relatorios"
          icon={<FileText className="h-5 w-5" />}
          label="Relatórios & Cartas"
          collapsed={collapsed}
        />
        <NavItem
          to="/artigos"
          icon={<BookOpen className="h-5 w-5" />}
          label="Artigos"
          collapsed={collapsed}
        />

        <div className="pt-4 mt-4 border-t border-sidebar-border">
          <NavItem
            to="/favoritos"
            icon={<Star className="h-5 w-5" />}
            label="Favoritos"
            collapsed={collapsed}
          />
          <NavItem
            to="/recentes"
            icon={<Clock className="h-5 w-5" />}
            label="Recentes"
            collapsed={collapsed}
          />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border">
        <NavItem
          to="/configuracoes"
          icon={<Settings className="h-5 w-5" />}
          label="Configurações"
          collapsed={collapsed}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn(
            'w-full mt-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed && 'px-2'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-sm">Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
