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
    color: 'from-primary to-blue-light',
  },
  {
    to: '/eua',
    icon: Flag,
    label: 'EUA',
    description: 'Mercado e macro EUA',
    color: 'from-navy to-navy-light',
  },
  {
    to: '/mercados',
    icon: TrendingUp,
    label: 'Mercados',
    description: 'Cotações e gráficos',
    color: 'from-gold to-gold-light',
  },
  {
    to: '/macro',
    icon: LayoutDashboard,
    label: 'Visão Global',
    description: 'Comparativo de países',
    color: 'from-primary to-blue-light',
  },
  {
    to: '/relatorios',
    icon: FileText,
    label: 'Relatórios',
    description: 'Cartas e análises',
    color: 'from-navy to-navy-light',
  },
];

export function QuickAccess() {
  return (
    <div className="bg-card rounded-xl border p-5">
      <h2 className="section-title mb-4">Acesso Rápido</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          const content = (
            <div
              className={cn(
                'group relative flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200',
                'bg-gradient-to-br',
                link.color,
                link.disabled
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:scale-[1.02] hover:shadow-md cursor-pointer'
              )}
            >
              <Icon className="h-6 w-6 text-white mb-2" />
              <span className="text-sm font-medium text-white">{link.label}</span>
              {!link.disabled && (
                <ArrowRight className="absolute right-2 top-2 h-4 w-4 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          );

          if (link.disabled) {
            return (
              <div key={link.to} className="relative">
                {content}
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                  Em breve
                </span>
              </div>
            );
          }

          return (
            <Link key={link.to} to={link.to}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
