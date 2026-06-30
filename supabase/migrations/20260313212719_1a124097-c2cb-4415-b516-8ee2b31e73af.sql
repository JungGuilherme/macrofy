
CREATE TABLE public.macro_series_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  category text NOT NULL,
  indicator text NOT NULL,
  source text NOT NULL,
  series_code text NOT NULL,
  endpoint_template text,
  unit text DEFAULT '%',
  frequency text DEFAULT 'monthly',
  default_mode text DEFAULT 'level',
  polarity text DEFAULT 'positive',
  sort_order integer DEFAULT 0,
  enabled boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(country, series_code)
);

CREATE TABLE public.macro_heatmap_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  category text NOT NULL,
  indicator text NOT NULL,
  source text NOT NULL,
  series_code text NOT NULL,
  source_table text,
  date date NOT NULL,
  frequency text DEFAULT 'monthly',
  unit text,
  raw_value numeric,
  display_value text,
  calc_mode text DEFAULT 'level',
  mom_value numeric,
  yoy_value numeric,
  ma3_value numeric,
  ma12_value numeric,
  heat_score numeric,
  polarity text DEFAULT 'positive',
  last_updated_at timestamptz DEFAULT now(),
  UNIQUE(country, series_code, date)
);

CREATE INDEX idx_macro_data_country_date ON public.macro_heatmap_data(country, date);
CREATE INDEX idx_macro_data_series ON public.macro_heatmap_data(series_code);
CREATE INDEX idx_macro_metadata_country ON public.macro_series_metadata(country, enabled);

ALTER TABLE public.macro_series_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_heatmap_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view macro metadata" ON public.macro_series_metadata FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage macro metadata" ON public.macro_series_metadata FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone authenticated can view macro data" ON public.macro_heatmap_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage macro data" ON public.macro_heatmap_data FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

INSERT INTO public.macro_series_metadata (country, category, indicator, source, series_code, unit, frequency, default_mode, polarity, sort_order, notes) VALUES
('BR', 'Confiança', 'Conf. Consumidor Fecomercio', 'Fecomercio', 'FECOM_CONS', 'pts', 'monthly', 'level', 'positive', 1, 'Inserção manual ou CSV'),
('BR', 'Confiança', 'Conf. Consumidor FGV', 'FGV', 'FGV_CONS', 'pts', 'monthly', 'level', 'positive', 2, 'Inserção manual ou CSV'),
('BR', 'Confiança', 'Conf. Indústria FGV', 'FGV', 'FGV_IND', 'pts', 'monthly', 'level', 'positive', 3, 'Inserção manual ou CSV'),
('BR', 'Atividade', 'Volume de Serviços', 'IBGE', 'IBGE_PMS', 'index', 'monthly', 'level', 'positive', 10, 'PMS dessaz'),
('BR', 'Atividade', 'Produção Industrial', 'IBGE', 'IBGE_PIM', 'index', 'monthly', 'level', 'positive', 11, 'PIM dessaz'),
('BR', 'Atividade', 'Varejo', 'IBGE', 'IBGE_PMC', 'index', 'monthly', 'level', 'positive', 12, 'PMC dessaz'),
('BR', 'Atividade', 'IBC-Br', 'BCB', '24364', 'index', 'monthly', 'level', 'positive', 13, 'IBC-Br dessazonalizado'),
('BR', 'Inflação', 'IPCA', 'BCB', '433', '%', 'monthly', 'level', 'negative', 20, 'IPCA variação mensal'),
('BR', 'Inflação', 'IPCA 12m', 'BCB', '13522', '%', 'monthly', 'level', 'negative', 21, 'IPCA acumulado 12 meses'),
('BR', 'Inflação', 'IPCA-15', 'BCB', '7478', '%', 'monthly', 'level', 'negative', 22, 'IPCA-15 variação mensal'),
('BR', 'Inflação', 'Núcleo IPCA', 'BCB', '11427', '%', 'monthly', 'level', 'negative', 23, 'Média aparada suavizada'),
('BR', 'Inflação', 'IPCA Serviços', 'BCB', '10844', '%', 'monthly', 'level', 'negative', 24, 'Serviços subjacentes'),
('BR', 'Trabalho', 'Desemprego', 'BCB', '24369', '%', 'monthly', 'level', 'negative', 30, 'PNAD taxa dessazonalizada'),
('BR', 'Trabalho', 'Ocupação', 'BCB', '24379', 'mi', 'monthly', 'level', 'positive', 31, 'Pessoas ocupadas PNAD'),
('BR', 'Trabalho', 'Renda Real', 'BCB', '24382', 'R$', 'monthly', 'level', 'positive', 33, 'Rendimento real efetivo'),
('BR', 'Fiscal/Externo', 'Dívida Bruta/PIB', 'BCB', '13762', '%', 'monthly', 'level', 'negative', 40, 'Dívida bruta percentual do PIB'),
('BR', 'Fiscal/Externo', 'Conta Corrente', 'BCB', '22707', 'USD mi', 'monthly', 'level', 'positive', 42, 'Transações correntes mensal'),
('BR', 'Fiscal/Externo', 'Reservas', 'BCB', '13621', 'USD mi', 'daily', 'level', 'positive', 43, 'Reservas internacionais'),
('BR', 'Financeiro', 'Selic', 'BCB', '11', '%', 'daily', 'level', 'negative', 50, 'Taxa Selic meta anualizada'),
('BR', 'Financeiro', 'Crédito Total', 'BCB', '20539', 'R$ mi', 'monthly', 'level', 'positive', 52, 'Crédito total do SFN'),
('BR', 'Financeiro', 'ICC', 'BCB', '25351', '%', 'monthly', 'level', 'negative', 53, 'Indicador de Custo do Crédito'),
('BR', 'Financeiro', 'Inadimplência', 'BCB', '21082', '%', 'monthly', 'level', 'negative', 54, 'Inadimplência total SFN');

INSERT INTO public.macro_series_metadata (country, category, indicator, source, series_code, unit, frequency, default_mode, polarity, sort_order, notes) VALUES
('US', 'Housing', '30y Mortgage Rate', 'FRED', 'MORTGAGE30US', '%', 'weekly', 'level', 'negative', 1, 'Freddie Mac 30Y Fixed Rate Mortgage'),
('US', 'Housing', 'Building Permits', 'FRED', 'PERMIT', 'k', 'monthly', 'level', 'positive', 2, 'New private housing units authorized'),
('US', 'Housing', 'Housing Starts', 'FRED', 'HOUST', 'k', 'monthly', 'level', 'positive', 3, 'New privately-owned housing units started'),
('US', 'Housing', 'New Home Sales', 'FRED', 'HSN1F', 'k', 'monthly', 'level', 'positive', 4, 'New single-family houses sold'),
('US', 'Activity', 'Real PCE', 'FRED', 'PCEC96', 'USD bn', 'monthly', 'level', 'positive', 10, 'Real Personal Consumption Expenditures'),
('US', 'Activity', 'Industrial Production', 'FRED', 'INDPRO', 'index', 'monthly', 'level', 'positive', 11, 'Industrial Production Index'),
('US', 'Activity', 'Retail Sales', 'FRED', 'RSAFS', 'USD mn', 'monthly', 'level', 'positive', 12, 'Advance Retail Sales'),
('US', 'Activity', 'Real GDP', 'FRED', 'GDPC1', 'USD bn', 'quarterly', 'level', 'positive', 13, 'Real GDP Seasonally Adjusted'),
('US', 'Labor', 'Unemployment Rate', 'FRED', 'UNRATE', '%', 'monthly', 'level', 'negative', 20, 'Civilian Unemployment Rate'),
('US', 'Labor', 'Payroll', 'FRED', 'PAYEMS', 'k', 'monthly', 'level', 'positive', 21, 'Total Nonfarm Payrolls'),
('US', 'Labor', 'Labor Force Part. Rate', 'FRED', 'CIVPART', '%', 'monthly', 'level', 'positive', 22, 'Civilian Labor Force Participation Rate'),
('US', 'Labor', 'Avg Hourly Earnings', 'FRED', 'CES0500000003', 'USD', 'monthly', 'level', 'positive', 23, 'Average Hourly Earnings Total Private'),
('US', 'Labor', 'Real Disp. Income', 'FRED', 'DSPIC96', 'USD bn', 'monthly', 'level', 'positive', 24, 'Real Disposable Personal Income'),
('US', 'Inflation', 'CPI', 'FRED', 'CPIAUCSL', 'index', 'monthly', 'level', 'negative', 30, 'CPI All Urban Consumers'),
('US', 'Inflation', 'Core CPI', 'FRED', 'CPILFESL', 'index', 'monthly', 'level', 'negative', 31, 'CPI Less Food and Energy'),
('US', 'Inflation', 'PCE', 'FRED', 'PCEPI', 'index', 'monthly', 'level', 'negative', 32, 'PCE Price Index'),
('US', 'Inflation', 'Core PCE', 'FRED', 'PCEPILFE', 'index', 'monthly', 'level', 'negative', 33, 'PCE Excluding Food and Energy'),
('US', 'Policy/Markets', 'Fed Funds', 'FRED', 'FEDFUNDS', '%', 'monthly', 'level', 'negative', 40, 'Effective Federal Funds Rate'),
('US', 'Policy/Markets', '10Y-2Y Spread', 'FRED', 'T10Y2Y', '%', 'daily', 'level', 'positive', 41, '10Y minus 2Y Treasury Spread'),
('US', 'Policy/Markets', 'Financial Stress', 'FRED', 'STLFSI4', 'index', 'weekly', 'level', 'negative', 42, 'St. Louis Fed Financial Stress Index');
