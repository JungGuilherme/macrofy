import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Flag,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const quickLinks = [
  {
    to: '/brasil',
    icon: Flag,
    label: 'Brasil',
    description: 'Mercado e macro BR',
  },
  {
    to: '/eua',
    icon: Flag,
    label: 'EUA',
    description: 'Mercado e macro EUA',
  },
  {
    to: '/mercados',
    icon: TrendingUp,
    label: 'Mercados',
    description: 'Cotações e gráficos',
  },
  {
    to: '/macro',
    icon: LayoutDashboard,
    label: 'Visão Global',
    description: 'Comparativo de países',
  },
  {
    to: '/relatorios',
    icon: FileText,
    label: 'Relatórios',
    description: 'Cartas e análises',
  },
];

export function QuickAccess() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {quickLinks.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              'group flex items-center gap-3 px-4 py-3 rounded-xl border bg-card transition-colors',
              'hover:border-primary/40 hover:bg-accent/50'
            )}
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
              <Icon className="h-[18px] w-[18px] text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground leading-tight">{link.label}</p>
              <p className="text-[11px] text-muted-foreground truncate">{link.description}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/0 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}
