import { PageHeader } from '@/components/common/PageHeader';
import { dashboardData, marketQuotes } from '@/data/mockData';
import { TrendingUp, TrendingDown, Minus, BarChart3, Globe, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  suffix?: string;
  subtitle?: string;
}

function KpiCard({ title, value, change, suffix = '', subtitle }: KpiCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="kpi-card">
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-foreground">
          {typeof value === 'number' ? value.toFixed(2) : value}
          {suffix}
        </p>
        {change !== undefined && (
          <span
            className={cn(
              'flex items-center text-sm font-medium',
              isPositive && 'text-success',
              isNegative && 'text-destructive',
              !isPositive && !isNegative && 'text-muted-foreground'
            )}
          >
            {isPositive && <TrendingUp className="h-4 w-4 mr-0.5" />}
            {isNegative && <TrendingDown className="h-4 w-4 mr-0.5" />}
            {!isPositive && !isNegative && <Minus className="h-4 w-4 mr-0.5" />}
            {isPositive && '+'}
            {change.toFixed(2)}%
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

interface DashboardLinkProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function DashboardLink({ to, icon, title, description }: DashboardLinkProps) {
  return (
    <Link
      to={to}
      className="content-card p-5 flex items-start gap-4 group"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </Link>
  );
}

export default function Dashboards() {
  const { brazil, global, market } = dashboardData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboards"
        subtitle="Visão geral dos principais indicadores"
        breadcrumbs={[{ label: 'Dashboards' }]}
      />

      {/* Summary KPIs */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Resumo do Mercado (YTD)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Ibovespa" value={market.ibovYtd} suffix="%" />
          <KpiCard title="S&P 500" value={market.spxYtd} suffix="%" />
          <KpiCard title="Dólar" value={market.dolarYtd} suffix="%" />
          <KpiCard title="Ouro" value={market.ouroYtd} suffix="%" />
        </div>
      </section>

      {/* Dashboard Links */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardLink
          to="/dashboards/brasil"
          icon={<Flag className="h-6 w-6 text-primary" />}
          title="Brasil"
          description="Inflação, atividade, fiscal e política monetária"
        />
        <DashboardLink
          to="/dashboards/global"
          icon={<Globe className="h-6 w-6 text-primary" />}
          title="Global"
          description="EUA, Europa, China e commodities"
        />
        <DashboardLink
          to="/dashboards/mercado"
          icon={<BarChart3 className="h-6 w-6 text-primary" />}
          title="Mercado"
          description="Bolsa, juros, câmbio, commodities e cripto"
        />
      </section>

      {/* Brazil Preview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Brasil</h2>
          <Link to="/dashboards/brasil" className="text-sm text-primary hover:underline">
            Ver mais →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="IPCA (12m)"
            value={brazil.ipca.current}
            suffix="%"
            subtitle={`Meta: ${brazil.ipca.target}% | Proj: ${brazil.ipca.projection}%`}
          />
          <KpiCard
            title="Selic"
            value={brazil.selic.current}
            suffix="%"
            subtitle={`Anterior: ${brazil.selic.previous}%`}
          />
          <KpiCard
            title="PIB (a.a.)"
            value={brazil.pib.current}
            suffix="%"
            subtitle={`Proj 2025: ${brazil.pib.projection}%`}
          />
          <KpiCard
            title="Dívida/PIB"
            value={brazil.divida.current}
            suffix="%"
          />
        </div>
      </section>

      {/* Global Preview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Global</h2>
          <Link to="/dashboards/global" className="text-sm text-primary hover:underline">
            Ver mais →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="PIB EUA"
            value={global.usaGdp.current}
            suffix="%"
            subtitle={`Proj: ${global.usaGdp.projection}%`}
          />
          <KpiCard
            title="CPI EUA"
            value={global.usaInflation.current}
            suffix="%"
            subtitle={`Meta: ${global.usaInflation.target}%`}
          />
          <KpiCard
            title="Fed Funds"
            value={global.fedFunds.current}
            suffix="%"
            subtitle={`Proj: ${global.fedFunds.projection}%`}
          />
          <KpiCard
            title="PIB Europa"
            value={global.euroGdp.current}
            suffix="%"
            subtitle={`Proj: ${global.euroGdp.projection}%`}
          />
        </div>
      </section>

      {/* Trading View Placeholder */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Gráficos em Tempo Real</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border p-6 h-64 flex flex-col items-center justify-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Widget TradingView - IBOV</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Placeholder</p>
          </div>
          <div className="bg-card rounded-xl border p-6 h-64 flex flex-col items-center justify-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Widget TradingView - USD/BRL</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Placeholder</p>
          </div>
        </div>
      </section>
    </div>
  );
}
