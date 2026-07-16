import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * Landing v2 — always dark, terminal-editorial. Deliberately independent of
 * the app theme system: explicit zinc palette, blue-600 accent, mono details.
 */

const MONO = { fontFamily: "'Roboto Mono', ui-monospace, monospace" };

/* ── Live scrolling ticker (TradingView embed — public, no auth needed) ── */
function LandingTicker() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container';
    wrapper.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    wrapper.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'INDEX:IBOV', title: 'IBOVESPA' },
        { proName: 'FX_IDC:USDBRL', title: 'USD/BRL' },
        { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
        { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
        { proName: 'BMFBOVESPA:IFIX', title: 'IFIX' },
        { proName: 'AMEX:EWZ', title: 'EWZ' },
        { proName: 'BLACKBULL:BRENT', title: 'Brent' },
        { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
        { proName: 'FX_IDC:EURUSD', title: 'EUR/USD' },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: 'dark',
      locale: 'br',
    });

    wrapper.appendChild(script);
    container.appendChild(wrapper);

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div className="border-y border-zinc-900 bg-zinc-950">
      <div ref={containerRef} className="w-full overflow-hidden" style={{ minHeight: '46px' }} />
    </div>
  );
}

/* ── Illustrative heatmap mock (labeled as such) ── */
interface MockRow {
  indicator: string;
  value: string;
  mom: number;
  yoy: number;
  trend: 'up' | 'down';
}

const MOCK_ROWS: MockRow[] = [
  { indicator: 'IPCA 12m', value: '4,87%', mom: 0.26, yoy: -0.31, trend: 'down' },
  { indicator: 'Selic meta', value: '14,25%', mom: 0, yoy: 3.5, trend: 'up' },
  { indicator: 'IBC-Br (a/a)', value: '+2,1%', mom: 0.4, yoy: 0.8, trend: 'up' },
  { indicator: 'CAGED (saldo)', value: '+142 mil', mom: -12.3, yoy: 8.2, trend: 'down' },
  { indicator: 'USD/BRL', value: '5,42', mom: -1.2, yoy: -4.8, trend: 'down' },
  { indicator: 'CPI EUA 12m', value: '2,6%', mom: 0.2, yoy: -0.5, trend: 'down' },
  { indicator: 'Fed Funds', value: '3,75–4,00%', mom: 0, yoy: -1.0, trend: 'down' },
];

function heatClass(v: number): string {
  if (v > 1) return 'bg-emerald-500/25 text-emerald-300';
  if (v > 0) return 'bg-emerald-500/10 text-emerald-400';
  if (v === 0) return 'bg-zinc-800 text-zinc-400';
  if (v > -1) return 'bg-red-500/10 text-red-400';
  return 'bg-red-500/25 text-red-300';
}

function fmtPct(v: number): string {
  const s = v > 0 ? '+' : '';
  return `${s}${v.toFixed(1).replace('.', ',')}`;
}

function HeatmapMock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl shadow-blue-950/30">
      {/* fake ticker strip */}
      <div className="flex items-center gap-5 px-4 py-2 border-b border-zinc-800 bg-zinc-900/80 overflow-hidden whitespace-nowrap text-[11px]" style={MONO}>
        <span className="text-zinc-500">IBOV</span>
        <span className="text-emerald-400">+0,84%</span>
        <span className="text-zinc-500">S&amp;P 500</span>
        <span className="text-emerald-400">+0,39%</span>
        <span className="text-zinc-500">USD/BRL</span>
        <span className="text-red-400">−0,52%</span>
        <span className="text-zinc-500">DI Jan/29</span>
        <span className="text-red-400">−0,06pp</span>
        <span className="text-zinc-500 hidden sm:inline">BRENT</span>
        <span className="text-emerald-400 hidden sm:inline">+1,10%</span>
      </div>

      {/* heatmap table */}
      <div className="p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_72px_56px_56px_40px] gap-1.5 px-2 pb-2 text-[10px] uppercase tracking-wider text-zinc-500" style={MONO}>
          <span>Indicador</span>
          <span className="text-right">Último</span>
          <span className="text-center">M/M</span>
          <span className="text-center">A/A</span>
          <span className="text-center">Tend.</span>
        </div>
        <div className="space-y-1">
          {MOCK_ROWS.map((r) => (
            <div
              key={r.indicator}
              className="grid grid-cols-[minmax(0,1fr)_72px_56px_56px_40px] gap-1.5 items-center px-2 py-1.5 rounded-md hover:bg-zinc-900 transition-colors"
            >
              <span className="text-[13px] text-zinc-200 truncate">{r.indicator}</span>
              <span className="text-[12px] text-zinc-100 text-right" style={MONO}>{r.value}</span>
              <span className={cn('text-[11px] text-center rounded px-1 py-0.5', heatClass(r.mom))} style={MONO}>
                {fmtPct(r.mom)}
              </span>
              <span className={cn('text-[11px] text-center rounded px-1 py-0.5', heatClass(r.yoy))} style={MONO}>
                {fmtPct(r.yoy)}
              </span>
              <span className="flex justify-center">
                {r.trend === 'up'
                  ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
              </span>
            </div>
          ))}
        </div>
        <p className="px-2 pt-2 text-[10px] text-zinc-600" style={MONO}>
          visualização ilustrativa
        </p>
      </div>
    </div>
  );
}

/* ── Login card ── */
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

  const inputClass =
    'w-full h-10 rounded-lg bg-zinc-900 border border-zinc-700 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-blue-500 transition-colors';

  return (
    <form onSubmit={handleLogin} className="space-y-3">
      <input
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={isLoading}
        className={inputClass}
        aria-label="Email"
      />
      <input
        type="password"
        placeholder="senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={isLoading}
        className={inputClass}
        aria-label="Senha"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center justify-center disabled:opacity-60"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar na plataforma'}
      </button>
      <p className="text-[11px] text-zinc-500 text-center flex items-center justify-center gap-3">
        <Link to="/login" className="text-blue-400 hover:text-blue-300">
          Criar acesso
        </Link>
        <span className="text-zinc-700">·</span>
        <Link to="/login" className="text-blue-400 hover:text-blue-300">
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}

/* ── Feature rows (numbered, no icon grid) ── */
const FEATURES: [string, string][] = [
  ['Macro Brasil em heatmap', 'IPCA e núcleos, Selic, IBC-Br, CAGED, câmbio e fiscal — nível, variação e tendência numa tabela só.'],
  ['EUA e o mundo', 'CPI, PCE, payroll e Fed Funds do FRED, mais o snapshot comparativo das 20 maiores economias.'],
  ['Curvas de juros', 'DI, NTN-B e Treasuries — a estrutura a termo completa, comparável entre datas.'],
  ['Mercados ao vivo', 'Ibovespa, dólar, bolsas globais, fluxo B3 e valuation histórico da bolsa brasileira.'],
  ['Notícias sem caça', 'Feed curado das principais fontes em formato de portal, organizado por tema, com morning call diário.'],
  ['Sentimento de mercado', 'Termômetro proprietário do apetite a risco — Brasil e EUA — atualizado diariamente.'],
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      {/* Top bar */}
      <header className="max-w-6xl mx-auto flex items-center justify-between px-5 md:px-6 py-5">
        <div className="flex items-center">
          <span className="font-bold text-xl tracking-tight" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
            MF
          </span>
          <span className="text-zinc-600 mx-2.5 font-light">|</span>
          <span className="font-semibold text-xs tracking-[0.22em] uppercase text-zinc-300" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
            Macrofy
          </span>
        </div>
        <Link
          to="/login"
          className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600"
        >
          Entrar
        </Link>
      </header>

      {/* Live market ticker */}
      <LandingTicker />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 md:px-6 pt-10 md:pt-16 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div className="space-y-6">
          <p className="text-[11px] tracking-[0.25em] uppercase text-blue-400" style={MONO}>
            macro · mercados · decisão
          </p>
          <h1 className="text-4xl md:text-[52px] leading-[1.05] font-bold tracking-tight">
            O quadro macro completo.
            <br />
            <span className="text-zinc-500">Sem ruído.</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-md leading-relaxed">
            Inflação, juros, atividade e mercados — Brasil e mundo — em painéis
            que você lê em segundos. Atualizados todos os dias, direto das fontes oficiais.
          </p>
          <p className="text-[11px] text-zinc-600 tracking-wider" style={MONO}>
            BCB · IBGE · FRED · WORLD BANK · ANBIMA · B3
          </p>

          <div className="pt-2 max-w-sm">
            <LoginCard />
          </div>
        </div>

        <div className="hidden sm:block">
          <HeatmapMock />
        </div>
      </section>

      {/* Features — numbered editorial rows */}
      <section className="border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-5 md:px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight mb-10">
            O que tem dentro
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {FEATURES.map(([title, body], i) => (
              <div key={title} className="flex gap-4">
                <span className="text-[13px] text-blue-500 pt-0.5 shrink-0" style={MONO}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-zinc-100 mb-1">{title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-5 md:px-6 py-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xl font-semibold tracking-tight text-center md:text-left">
            Menos abas abertas. Mais convicção.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Acessar o Macrofy
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-5 md:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-600" style={MONO}>
          <span>© {new Date().getFullYear()} MACROFY</span>
          <span>research macroeconômico independente</span>
        </div>
      </footer>
    </div>
  );
}
