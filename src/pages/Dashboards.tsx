import { PageHeader } from '@/components/common/PageHeader';
import { BarChart3, Globe, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboards"
        subtitle="Visão geral dos principais indicadores"
        breadcrumbs={[{ label: 'Dashboards' }]}
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardLink
          to="/brasil"
          icon={<Flag className="h-6 w-6 text-primary" />}
          title="Brasil"
          description="Inflação, atividade, fiscal e política monetária"
        />
        <DashboardLink
          to="/eua"
          icon={<Globe className="h-6 w-6 text-primary" />}
          title="EUA & Global"
          description="Fed, inflação americana, crescimento global"
        />
        <DashboardLink
          to="/mercados"
          icon={<BarChart3 className="h-6 w-6 text-primary" />}
          title="Mercados"
          description="Bolsa, juros, câmbio, commodities e cripto"
        />
      </section>
    </div>
  );
}
