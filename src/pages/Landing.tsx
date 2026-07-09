import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2,
  Flag,
  Globe,
  LineChart,
  BarChart2,
  Newspaper,
  Gauge,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Flag,
    title: 'Macro Brasil',
    description:
      'IPCA com núcleos, Selic, IBC-Br, CAGED, câmbio e fiscal — em heatmap com tendência e histórico.',
  },
  {
    icon: Globe,
    title: 'EUA & Global',
    description:
      'CPI, PCE, payroll e Fed Funds direto do FRED, mais o comparativo das 20 maiores economias.',
  },
  {
    icon: LineChart,
    title: 'Curvas de Juros',
    description:
      'Curva DI, NTN-B e Treasuries — estrutura a termo completa, com comparação entre datas.',
  },
  {
    icon: BarChart2,
    title: 'Mercados ao Vivo',
    description:
      'Ibovespa, dólar, bolsas globais, fluxo B3 e valuation histórico em um só painel.',
  },
  {
    icon: Newspaper,
    title: 'Notícias & Morning Call',
    description:
      'Feed curado das principais fontes, organizado por tema, e o resumo diário do mercado.',
  },
  {
    icon: Gauge,
    title: 'Termômetro de Sentimento',
    description:
      'Índice proprietário que resume o apetite a risco do mercado brasileiro e americano.',
  },
];

const SOURCES = ['Banco Central', 'IBGE', 'FRED', 'World Bank', 'ANBIMA', 'B3'];

function LoginCard() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error('Erro ao fazer login', { description: error.message });
    } else {
      navigate('/');
    }
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-lg">
      <h2 className="font-semibold text-foreground mb-1">Acesse a plataforma</h2>
      <p className="text-sm text-muted-foreground mb-5">Entre com sua conta para continuar</p>
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="landing-email">Email</Label>
          <Input
            id="landing-email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="landing-password">Senha</Label>
          <Input
            id="landing-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando…
            </>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground text-center mt-4">
        Ainda não tem conta?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-0">
          <span
            className="font-bold text-2xl tracking-tight"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
          >
            MF
          </span>
          <span className="text-muted-foreground mx-2.5 text-xl font-light">|</span>
          <span
            className="font-semibold text-sm tracking-[0.18em] uppercase"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
          >
            Macrofy
          </span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/login">Entrar</Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-20 grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
        <div className="lg:col-span-3 space-y-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Plataforma de research macroeconômico
          </p>
          <h1
            className="text-4xl md:text-5xl leading-tight font-bold"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
          >
            Tudo de macro que você precisa para operar com convicção.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            Inflação, juros, atividade, emprego e mercados — Brasil, EUA e o mundo —
            reunidos em painéis claros, atualizados todos os dias com dados oficiais.
          </p>
          <ul className="space-y-2">
            {[
              'Dados diretos das fontes: BCB, IBGE, FRED e World Bank',
              'Heatmaps e tendências que mostram o quadro em segundos',
              'Atualização automática diária — sem planilha manual',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-2 flex justify-center lg:justify-end">
          <LoginCard />
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
          >
            O que você encontra no Macrofy
          </h2>
          <p className="text-muted-foreground mb-10">
            Um cockpit completo para decisões de investimento informadas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sources strip */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-5">
          Dados oficiais, atualizados diariamente
        </p>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {SOURCES.map((s) => (
            <span key={s} className="text-sm font-medium text-muted-foreground/80">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-14 flex flex-col items-center text-center gap-4">
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
          >
            Pronto para decidir com dados?
          </h2>
          <Button size="lg" asChild>
            <Link to="/login">
              Acessar o Macrofy
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Macrofy</span>
          <span>Research macroeconômico independente</span>
        </div>
      </footer>
    </div>
  );
}
