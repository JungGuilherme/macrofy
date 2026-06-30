import { Link } from 'react-router-dom';
import { reports, articles } from '@/data/mockData';
import { ArrowRight, FileText, BookOpen } from 'lucide-react';

const recentReports = reports.slice(0, 3);
const recentArticles = articles.slice(0, 2);

export function RecentContent() {
  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="section-title">Conteúdos Recentes</h2>
        </div>
      </div>

      <div className="space-y-4">
        {/* Reports */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Relatórios & Cartas
          </h3>
          <div className="space-y-2">
            {recentReports.map((report) => (
              <Link
                key={report.id}
                to={`/relatorios/${report.id}`}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {report.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {new Date(report.publishedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <Link
            to="/relatorios"
            className="flex items-center gap-1 text-sm text-primary hover:underline mt-2"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Articles */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Artigos
          </h3>
          <div className="space-y-2">
            {recentArticles.map((article) => (
              <Link
                key={article.id}
                to={`/artigos/${article.id}`}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-4 w-4 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {article.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {article.readTime} min de leitura
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <Link
            to="/artigos"
            className="flex items-center gap-1 text-sm text-primary hover:underline mt-2"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
