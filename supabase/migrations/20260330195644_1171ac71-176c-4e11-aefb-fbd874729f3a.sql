
-- Macrofy Sentiment Index tables

CREATE TABLE IF NOT EXISTS public.market_raw_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_key text NOT NULL,
  region text NOT NULL DEFAULT 'us',
  date date NOT NULL,
  value numeric,
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(series_key, date)
);
ALTER TABLE public.market_raw_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view market_raw_series" ON public.market_raw_series FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage market_raw_series" ON public.market_raw_series FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.macrofy_sentiment_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  date date NOT NULL,
  component_key text NOT NULL,
  raw_value numeric,
  normalized_score numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(region, date, component_key)
);
ALTER TABLE public.macrofy_sentiment_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view sentiment components" ON public.macrofy_sentiment_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage sentiment components" ON public.macrofy_sentiment_components FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.macrofy_sentiment_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  date date NOT NULL,
  headline_score numeric,
  regime_label text,
  valid_components_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(region, date)
);
ALTER TABLE public.macrofy_sentiment_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view sentiment index" ON public.macrofy_sentiment_index FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage sentiment index" ON public.macrofy_sentiment_index FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.macrofy_sentiment_config (
  component_key text NOT NULL,
  region text NOT NULL,
  source_key text,
  is_inverted boolean DEFAULT false,
  is_active boolean DEFAULT true,
  notes text,
  PRIMARY KEY(component_key, region)
);
ALTER TABLE public.macrofy_sentiment_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view sentiment config" ON public.macrofy_sentiment_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sentiment config" ON public.macrofy_sentiment_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role can manage sentiment config" ON public.macrofy_sentiment_config FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.macrofy_sentiment_config (component_key, region, source_key, is_inverted, is_active, notes) VALUES
  ('momentum', 'us', '^GSPC', false, true, 'S&P 500 distance from MA125'),
  ('volatility', 'us', '^VIX', true, true, 'VIX distance from MA50'),
  ('safe_haven', 'us', 'SPY_vs_TLT', false, true, '20d return stocks vs bonds'),
  ('junk_bond', 'us', 'BAMLH0A0HYM2', true, true, 'HY spread from FRED'),
  ('breadth', 'us', 'us_sector_etfs', false, true, 'Pct of sector ETFs above MA200'),
  ('momentum', 'br', '^BVSP', false, true, 'Ibovespa distance from MA125'),
  ('strength', 'br', 'br_basket_ma200', false, true, 'Pct of BR stocks above MA200'),
  ('breadth', 'br', 'br_basket_positive', false, true, 'Pct positive daily return'),
  ('volatility', 'br', '^BVSP_vol', true, true, 'Realized vol 21d Ibovespa'),
  ('foreign_flow', 'br', 'b3_flow_daily', false, true, 'B3 foreign flow 21d rolling');
