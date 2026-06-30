// Alta Vista Research Portal - Mock Data

export interface MarketQuote {
  id: string;
  name: string;
  ticker: string;
  value: number;
  change: number;
  changePercent: number;
  category: 'bolsa' | 'juros' | 'cambio' | 'commodities' | 'cripto';
}

export interface EconomicEvent {
  id: string;
  time: string;
  event: string;
  country: string;
  impact: 'low' | 'medium' | 'high';
  actual?: string;
  forecast?: string;
  previous?: string;
}

export interface Recommendation {
  id: string;
  name: string;
  ticker: string;
  category: 'fii' | 'acao' | 'renda-fixa' | 'fundo' | 'internacional';
  status: 'em-oferta' | 'ativa' | 'monitoramento' | 'encerrada';
  profile: 'conservador' | 'moderado' | 'arrojado';
  thesis: string;
  summary: string[];
  targetAudience: string[];
  risks: { description: string; severity: 'baixo' | 'medio' | 'alto' }[];
  clientExplanation: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  featured?: boolean;
  isNew?: boolean;
}

export interface Report {
  id: string;
  title: string;
  type: 'carta-mensal' | 'relatorio' | 'morning-call' | 'nota';
  theme: 'macro' | 'acoes' | 'juros' | 'fiis' | 'internacional';
  summary: string;
  insights: string[];
  author: string;
  publishedAt: string;
  tags: string[];
}

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  author: string;
  publishedAt: string;
  tags: string[];
  readTime: number;
}

export interface Alert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  createdAt: string;
}

// Market Quotes
export const marketQuotes: MarketQuote[] = [
  { id: '1', name: 'Ibovespa', ticker: 'IBOV', value: 128456, change: 1234, changePercent: 0.97, category: 'bolsa' },
  { id: '2', name: 'S&P 500', ticker: 'SPX', value: 5892.45, change: 23.12, changePercent: 0.39, category: 'bolsa' },
  { id: '3', name: 'Nasdaq', ticker: 'NDX', value: 21034.78, change: -45.23, changePercent: -0.21, category: 'bolsa' },
  { id: '4', name: 'Dólar', ticker: 'USD/BRL', value: 6.12, change: -0.03, changePercent: -0.49, category: 'cambio' },
  { id: '5', name: 'Euro', ticker: 'EUR/BRL', value: 6.38, change: 0.02, changePercent: 0.31, category: 'cambio' },
  { id: '6', name: 'DI Jan/26', ticker: 'DI1F26', value: 14.85, change: 0.05, changePercent: 0.34, category: 'juros' },
  { id: '7', name: 'DI Jan/29', ticker: 'DI1F29', value: 14.22, change: -0.08, changePercent: -0.56, category: 'juros' },
  { id: '8', name: 'Petróleo WTI', ticker: 'CL1', value: 78.45, change: 1.23, changePercent: 1.59, category: 'commodities' },
  { id: '9', name: 'Ouro', ticker: 'GC1', value: 2645.30, change: 12.50, changePercent: 0.47, category: 'commodities' },
  { id: '10', name: 'Bitcoin', ticker: 'BTC', value: 98234, change: 2341, changePercent: 2.44, category: 'cripto' },
  { id: '11', name: 'Ethereum', ticker: 'ETH', value: 3456.78, change: -23.45, changePercent: -0.67, category: 'cripto' },
  { id: '12', name: 'Minério de Ferro', ticker: 'SGX', value: 108.50, change: -1.20, changePercent: -1.09, category: 'commodities' },
];

// Economic Events
export const economicEvents: EconomicEvent[] = [
  { id: '1', time: '09:00', event: 'IPCA-15 (Jan)', country: 'BR', impact: 'high', actual: '0.52%', forecast: '0.48%', previous: '0.40%' },
  { id: '2', time: '10:30', event: 'PIB 4T24 (1ª leitura)', country: 'US', impact: 'high', forecast: '2.8%', previous: '3.1%' },
  { id: '3', time: '11:00', event: 'Confiança do Consumidor', country: 'US', impact: 'medium', forecast: '104.5', previous: '104.7' },
  { id: '4', time: '14:30', event: 'Decisão de Juros Fed', country: 'US', impact: 'high' },
  { id: '5', time: '15:00', event: 'Coletiva Jerome Powell', country: 'US', impact: 'high' },
  { id: '6', time: '08:00', event: 'IGP-M (Jan)', country: 'BR', impact: 'medium', actual: '0.27%', forecast: '0.30%', previous: '0.94%' },
];

// Alerts
export const houseAlerts: Alert[] = [
  { id: '1', message: 'IPCA-15 acima do esperado reforça cenário de Selic alta por mais tempo', type: 'warning', createdAt: '2025-01-15T09:30:00' },
  { id: '2', message: 'Nova recomendação: MXRF11 entra na carteira de FIIs', type: 'success', createdAt: '2025-01-15T08:00:00' },
  { id: '3', message: 'Decisão do Fed hoje às 14:30 - volatilidade esperada', type: 'info', createdAt: '2025-01-15T07:00:00' },
];

// Recommendations
export const recommendations: Recommendation[] = [
  {
    id: '1',
    name: 'Maxi Renda FII',
    ticker: 'MXRF11',
    category: 'fii',
    status: 'em-oferta',
    profile: 'moderado',
    thesis: 'FII de papel com carteira diversificada e yield atrativo em cenário de juros altos',
    summary: [
      'Dividend yield de 12,5% ao ano',
      'Carteira majoritariamente em CRIs indexados ao CDI',
      'Gestão experiente com track record consistente',
      'Desconto de 8% sobre valor patrimonial'
    ],
    targetAudience: ['Investidores buscando renda recorrente', 'Perfil moderado a arrojado', 'Horizonte mínimo de 2 anos'],
    risks: [
      { description: 'Risco de crédito dos CRIs da carteira', severity: 'medio' },
      { description: 'Sensibilidade à curva de juros', severity: 'baixo' },
      { description: 'Liquidez em momentos de estresse', severity: 'baixo' }
    ],
    clientExplanation: 'É um fundo que investe em títulos de crédito imobiliário e paga dividendos mensais. Com os juros altos, a rentabilidade esperada é de cerca de 12% ao ano, acima da maioria das aplicações de renda fixa.',
    tags: ['dividendos', 'renda', 'cdi+', 'fii-papel'],
    publishedAt: '2025-01-15',
    updatedAt: '2025-01-15',
    featured: true,
    isNew: true
  },
  {
    id: '2',
    name: 'Itaú Unibanco',
    ticker: 'ITUB4',
    category: 'acao',
    status: 'ativa',
    profile: 'moderado',
    thesis: 'Maior banco privado do país com valuation atrativo e dividend yield elevado',
    summary: [
      'P/L de 7,5x, desconto de 15% vs. média histórica',
      'Dividend yield de 8% projetado para 2025',
      'ROE consistente acima de 20%',
      'Liderança em eficiência operacional'
    ],
    targetAudience: ['Investidores de longo prazo', 'Buscando dividendos e valorização', 'Perfil moderado'],
    risks: [
      { description: 'Exposição ao ciclo econômico brasileiro', severity: 'medio' },
      { description: 'Competição de fintechs em alguns segmentos', severity: 'baixo' }
    ],
    clientExplanation: 'É o maior banco privado do Brasil, muito sólido e que paga bons dividendos. Está mais barato que a média histórica e deve continuar lucrando bastante.',
    tags: ['dividendos', 'bancario', 'blue-chip', 'valor'],
    publishedAt: '2025-01-10',
    updatedAt: '2025-01-14',
    featured: true
  },
  {
    id: '3',
    name: 'Tesouro IPCA+ 2035',
    ticker: 'IPCA+35',
    category: 'renda-fixa',
    status: 'ativa',
    profile: 'conservador',
    thesis: 'Taxa real historicamente elevada para proteção de longo prazo',
    summary: [
      'Taxa real de IPCA + 7,2% ao ano',
      'Proteção contra inflação garantida',
      'Risco soberano (rating grau de investimento)',
      'Ideal para objetivos de longo prazo'
    ],
    targetAudience: ['Investidores conservadores', 'Planejamento de aposentadoria', 'Horizonte de 10+ anos'],
    risks: [
      { description: 'Marcação a mercado no curto prazo', severity: 'medio' },
      { description: 'Risco fiscal do país', severity: 'baixo' }
    ],
    clientExplanation: 'É um título público que protege seu dinheiro da inflação e ainda paga mais de 7% ao ano de juros reais. Ideal para quem pensa no longo prazo.',
    tags: ['inflacao', 'protecao', 'longo-prazo', 'tesouro'],
    publishedAt: '2025-01-08',
    updatedAt: '2025-01-12'
  },
  {
    id: '4',
    name: 'WEG',
    ticker: 'WEGE3',
    category: 'acao',
    status: 'monitoramento',
    profile: 'arrojado',
    thesis: 'Líder global em motores elétricos com exposição a tendências estruturais',
    summary: [
      'Exposição ao crescimento de energia renovável',
      'Receita internacional mitiga risco Brasil',
      'Histórico de crescimento de lucros consistente',
      'Múltiplos esticados no curto prazo'
    ],
    targetAudience: ['Investidores de crescimento', 'Horizonte de 5+ anos', 'Perfil arrojado'],
    risks: [
      { description: 'Valuation elevado (P/L 30x)', severity: 'alto' },
      { description: 'Desaceleração econômica global', severity: 'medio' }
    ],
    clientExplanation: 'É uma das melhores empresas do Brasil, líder mundial em motores elétricos. Está cara, por isso mantemos em monitoramento aguardando melhor ponto de entrada.',
    tags: ['crescimento', 'exportadora', 'energia', 'qualidade'],
    publishedAt: '2024-12-15',
    updatedAt: '2025-01-10'
  },
  {
    id: '5',
    name: 'Verde AM Global',
    ticker: 'VERDE',
    category: 'fundo',
    status: 'ativa',
    profile: 'arrojado',
    thesis: 'Fundo macro global com gestão premiada e track record de longo prazo',
    summary: [
      'Retorno histórico de CDI + 8% ao ano',
      'Gestão de Luis Stuhlberger, referência no mercado',
      'Mandato global permite capturar oportunidades diversas',
      'Volatilidade moderada para a categoria'
    ],
    targetAudience: ['Investidores sofisticados', 'Buscando alpha', 'Perfil arrojado'],
    risks: [
      { description: 'Pode ter retornos negativos em períodos curtos', severity: 'medio' },
      { description: 'Taxa de performance impacta retorno final', severity: 'baixo' }
    ],
    clientExplanation: 'É um fundo gerido por um dos maiores gestores do Brasil, que investe no mundo todo buscando as melhores oportunidades. Historicamente entrega retornos bem acima do CDI.',
    tags: ['macro', 'global', 'alpha', 'gestor-renomado'],
    publishedAt: '2025-01-05',
    updatedAt: '2025-01-13'
  },
  {
    id: '6',
    name: 'NVIDIA',
    ticker: 'NVDA',
    category: 'internacional',
    status: 'ativa',
    profile: 'arrojado',
    thesis: 'Líder absoluta em chips para IA com crescimento exponencial de receitas',
    summary: [
      'Market share de 90% em GPUs para data centers',
      'Receita crescendo 100%+ ao ano',
      'Margem bruta acima de 70%',
      'Tendência secular de IA favorece a empresa'
    ],
    targetAudience: ['Investidores de tecnologia', 'Alta tolerância a volatilidade', 'Perfil arrojado'],
    risks: [
      { description: 'Valuation muito elevado', severity: 'alto' },
      { description: 'Dependência do ciclo de IA', severity: 'alto' },
      { description: 'Competição crescente (AMD, Intel, custom chips)', severity: 'medio' }
    ],
    clientExplanation: 'É a empresa que domina o mercado de chips para inteligência artificial. Está crescendo muito rápido, mas também está cara. Para quem acredita no futuro da IA.',
    tags: ['tech', 'ia', 'crescimento', 'usa'],
    publishedAt: '2025-01-02',
    updatedAt: '2025-01-14',
    isNew: true
  },
  {
    id: '7',
    name: 'Kinea Renda Imobiliária',
    ticker: 'KNRI11',
    category: 'fii',
    status: 'ativa',
    profile: 'conservador',
    thesis: 'FII de tijolo com portfólio premium e gestão institucional',
    summary: [
      'Portfólio de lajes corporativas triple-A em SP',
      'Vacância abaixo da média do mercado',
      'Contratos longos com reajuste por inflação',
      'Dividend yield de 9% ao ano'
    ],
    targetAudience: ['Investidores conservadores', 'Buscando renda previsível', 'Perfil conservador a moderado'],
    risks: [
      { description: 'Sensibilidade ao mercado imobiliário corporativo', severity: 'baixo' },
      { description: 'Risco de vacância em cenário recessivo', severity: 'baixo' }
    ],
    clientExplanation: 'É um fundo que possui prédios comerciais de altíssima qualidade em São Paulo. Paga dividendos mensais estáveis e tem contratos longos com inquilinos sólidos.',
    tags: ['fii-tijolo', 'lajes', 'renda', 'premium'],
    publishedAt: '2024-12-20',
    updatedAt: '2025-01-08'
  },
  {
    id: '8',
    name: 'Petrobras PN',
    ticker: 'PETR4',
    category: 'acao',
    status: 'ativa',
    profile: 'arrojado',
    thesis: 'Dividend yield extraordinário com valuation descontado vs. pares globais',
    summary: [
      'Dividend yield projetado de 15%+ para 2025',
      'Múltiplo EV/EBITDA 40% abaixo da média global',
      'Produção crescente no pré-sal',
      'Geração de caixa robusta'
    ],
    targetAudience: ['Investidores de valor', 'Alta tolerância a risco político', 'Perfil arrojado'],
    risks: [
      { description: 'Risco de interferência política', severity: 'alto' },
      { description: 'Volatilidade do preço do petróleo', severity: 'alto' },
      { description: 'Mudanças na política de dividendos', severity: 'medio' }
    ],
    clientExplanation: 'A Petrobras está muito barata e pagando dividendos altíssimos. O risco político existe, mas os fundamentos são excelentes para quem aceita a volatilidade.',
    tags: ['dividendos', 'petroleo', 'valor', 'estatal'],
    publishedAt: '2025-01-12',
    updatedAt: '2025-01-15',
    featured: true
  },
];

// Reports
export const reports: Report[] = [
  {
    id: '1',
    title: 'Carta Mensal Janeiro 2025',
    type: 'carta-mensal',
    theme: 'macro',
    summary: 'Análise do cenário macro global e brasileiro para o primeiro trimestre, com foco em política monetária e seus impactos nos mercados.',
    insights: [
      'Selic deve permanecer em 14,25% até pelo menos junho',
      'Fed pode iniciar cortes no segundo semestre',
      'Dólar deve oscilar entre R$ 5,80 e R$ 6,30'
    ],
    author: 'Equipe de Análise',
    publishedAt: '2025-01-10',
    tags: ['macro', 'juros', 'cambio']
  },
  {
    id: '2',
    title: 'Relatório de Ações: Bancos',
    type: 'relatorio',
    theme: 'acoes',
    summary: 'Análise setorial dos principais bancos listados na B3, com atualização de preços-alvo e recomendações.',
    insights: [
      'Itaú continua como top pick do setor',
      'Spreads devem se manter elevados em 2025',
      'Inadimplência estabilizando'
    ],
    author: 'Pedro Mendes',
    publishedAt: '2025-01-08',
    tags: ['bancos', 'acoes', 'setorial']
  },
  {
    id: '3',
    title: 'Morning Call 15/01',
    type: 'morning-call',
    theme: 'macro',
    summary: 'Resumo dos principais acontecimentos da noite e agenda do dia com foco na decisão do Fed.',
    insights: [
      'Mercados asiáticos fecharam mistos',
      'Fed deve manter juros, foco no comunicado',
      'IPCA-15 surpreendeu para cima'
    ],
    author: 'Equipe de Análise',
    publishedAt: '2025-01-15',
    tags: ['morning-call', 'diario', 'mercados']
  },
  {
    id: '4',
    title: 'Nota: Impacto do IPCA-15',
    type: 'nota',
    theme: 'macro',
    summary: 'Análise rápida do IPCA-15 de janeiro e implicações para política monetária.',
    insights: [
      'Serviços seguem pressionados',
      'BC deve manter tom hawkish',
      'Projeção de IPCA 2025 revisada para 5,2%'
    ],
    author: 'Ana Costa',
    publishedAt: '2025-01-15',
    tags: ['ipca', 'inflacao', 'selic']
  },
  {
    id: '5',
    title: 'Guia de FIIs 2025',
    type: 'relatorio',
    theme: 'fiis',
    summary: 'Panorama completo do mercado de fundos imobiliários com nossas escolhas para o ano.',
    insights: [
      'FIIs de papel oferecem melhor risco-retorno',
      'Tijolo deve se recuperar no segundo semestre',
      'IFIX pode valorizar 15-20% no ano'
    ],
    author: 'Lucas Ribeiro',
    publishedAt: '2025-01-05',
    tags: ['fiis', 'guia', 'carteira']
  },
  {
    id: '6',
    title: 'EUA: Análise do Novo Governo',
    type: 'relatorio',
    theme: 'internacional',
    summary: 'Impactos esperados das políticas do novo governo americano nos mercados globais e brasileiros.',
    insights: [
      'Tarifas podem pressionar câmbio emergente',
      'Desregulação beneficia setor financeiro',
      'Inflação pode surpreender para cima'
    ],
    author: 'Equipe Internacional',
    publishedAt: '2025-01-12',
    tags: ['eua', 'politica', 'internacional']
  },
];

// Articles
export const articles: Article[] = [
  {
    id: '1',
    title: 'Como Explicar a Alta do Dólar para seus Clientes',
    subtitle: 'Guia prático com argumentos e analogias para conversas difíceis',
    content: 'O dólar bateu R$ 6 e muitos clientes estão preocupados...',
    author: 'Equipe Alta Vista',
    publishedAt: '2025-01-14',
    tags: ['comunicacao', 'cambio', 'cliente'],
    readTime: 5
  },
  {
    id: '2',
    title: 'O Que é e Como Funciona a Marcação a Mercado',
    subtitle: 'Entenda de uma vez por todas e saiba explicar para o cliente',
    content: 'A marcação a mercado é um conceito fundamental...',
    author: 'Pedro Mendes',
    publishedAt: '2025-01-10',
    tags: ['educacao', 'renda-fixa', 'conceitos'],
    readTime: 8
  },
  {
    id: '3',
    title: 'Carteira Recomendada: Atualização Janeiro',
    subtitle: 'Mudanças e fundamentos das nossas escolhas',
    content: 'Iniciamos 2025 com ajustes importantes na carteira...',
    author: 'Equipe de Análise',
    publishedAt: '2025-01-08',
    tags: ['carteira', 'alocacao', 'estrategia'],
    readTime: 6
  },
  {
    id: '4',
    title: 'FIIs vs. Imóvel Físico: Argumentos para o Cliente',
    subtitle: 'Como responder a objeção mais comum sobre fundos imobiliários',
    content: 'Todo AAI já ouviu: por que eu compraria cotas se posso comprar um apartamento?...',
    author: 'Lucas Ribeiro',
    publishedAt: '2025-01-05',
    tags: ['fiis', 'argumentacao', 'cliente'],
    readTime: 7
  },
  {
    id: '5',
    title: 'Renda Fixa em 2025: O Ano dos Prefixados?',
    subtitle: 'Análise das oportunidades e riscos no cenário atual',
    content: 'Com a Selic em 14,25% e projeções de queda no médio prazo...',
    author: 'Ana Costa',
    publishedAt: '2025-01-03',
    tags: ['renda-fixa', 'estrategia', 'analise'],
    readTime: 10
  },
];

// Dashboard data
export const dashboardData = {
  brazil: {
    ipca: { current: 4.62, previous: 4.83, target: 3.0, projection: 5.2 },
    selic: { current: 14.25, previous: 13.25, projection: 14.25 },
    pib: { current: 3.2, previous: 2.9, projection: 2.0 },
    divida: { current: 78.5, previous: 76.8 },
  },
  global: {
    usaGdp: { current: 2.8, previous: 3.1, projection: 2.4 },
    usaInflation: { current: 3.2, previous: 3.4, target: 2.0 },
    fedFunds: { current: 5.25, previous: 5.25, projection: 4.75 },
    euroGdp: { current: 0.8, previous: 0.5, projection: 1.0 },
  },
  market: {
    ibovYtd: 2.3,
    spxYtd: 4.1,
    dolarYtd: 1.8,
    ouroYtd: 3.2,
  }
};
