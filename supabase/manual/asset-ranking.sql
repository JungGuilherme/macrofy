-- Ranking de Ativos ("tabela periódica" de retornos)
-- ⚠️ O banco é Lovable Cloud: cole este arquivo inteiro no chat do Lovable
-- pedindo "run this SQL in my database", ou no SQL editor se tiver acesso.

CREATE TABLE IF NOT EXISTS public.ranking_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL,
  color text NOT NULL DEFAULT '#2563eb',
  sort_order integer DEFAULT 0,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS public.ranking_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.ranking_assets(id) ON DELETE CASCADE,
  period text NOT NULL,           -- '2019' … '2025', 'YTD'
  return_pct numeric NOT NULL,    -- retorno do período em %
  created_at timestamptz DEFAULT now(),
  UNIQUE(asset_id, period)
);

ALTER TABLE public.ranking_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read ranking assets"
  ON public.ranking_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage ranking assets"
  ON public.ranking_assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read ranking returns"
  ON public.ranking_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage ranking returns"
  ON public.ranking_returns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed: kit Brasil + global (cores validadas p/ acessibilidade)
INSERT INTO public.ranking_assets (name, short_name, color, sort_order) VALUES
  ('Ibovespa',       'IBOV',   '#2563eb', 1),
  ('S&P 500 (BRL)',  'S&P500', '#7c3aed', 2),
  ('IFIX',           'IFIX',   '#0d9488', 3),
  ('IMA-B',          'IMA-B',  '#0891b2', 4),
  ('CDI',            'CDI',    '#65a30d', 5),
  ('Poupança',       'POUP',   '#92400e', 6),
  ('Dólar',          'USD',    '#059669', 7),
  ('Ouro (BRL)',     'OURO',   '#d97706', 8),
  ('Bitcoin (BRL)',  'BTC',    '#db2777', 9),
  ('IPCA',           'IPCA',   '#dc2626', 10)
ON CONFLICT (name) DO NOTHING;

-- Seed de retornos 2019–2024 (valores APROXIMADOS para demonstração —
-- revise e corrija pelo editor admin antes de publicar!)
WITH a AS (SELECT id, name FROM public.ranking_assets)
INSERT INTO public.ranking_returns (asset_id, period, return_pct)
SELECT a.id, v.period, v.ret
FROM a
JOIN (VALUES
  ('CDI','2019',5.96),('CDI','2020',2.76),('CDI','2021',4.42),('CDI','2022',12.39),('CDI','2023',13.04),('CDI','2024',10.88),
  ('Ibovespa','2019',31.58),('Ibovespa','2020',2.92),('Ibovespa','2021',-11.93),('Ibovespa','2022',4.69),('Ibovespa','2023',22.28),('Ibovespa','2024',-10.36),
  ('IFIX','2019',35.98),('IFIX','2020',-10.24),('IFIX','2021',-2.28),('IFIX','2022',2.22),('IFIX','2023',15.45),('IFIX','2024',-5.89),
  ('IMA-B','2019',22.95),('IMA-B','2020',6.41),('IMA-B','2021',-1.26),('IMA-B','2022',6.15),('IMA-B','2023',14.30),('IMA-B','2024',-2.00),
  ('Dólar','2019',4.02),('Dólar','2020',28.93),('Dólar','2021',7.39),('Dólar','2022',-6.50),('Dólar','2023',-7.95),('Dólar','2024',27.35),
  ('Ouro (BRL)','2019',22.50),('Ouro (BRL)','2020',55.90),('Ouro (BRL)','2021',3.50),('Ouro (BRL)','2022',-0.50),('Ouro (BRL)','2023',4.50),('Ouro (BRL)','2024',61.60),
  ('S&P 500 (BRL)','2019',35.20),('S&P 500 (BRL)','2020',49.90),('S&P 500 (BRL)','2021',38.20),('S&P 500 (BRL)','2022',-24.60),('S&P 500 (BRL)','2023',14.40),('S&P 500 (BRL)','2024',57.00),
  ('Bitcoin (BRL)','2019',97.00),('Bitcoin (BRL)','2020',422.00),('Bitcoin (BRL)','2021',71.00),('Bitcoin (BRL)','2022',-66.30),('Bitcoin (BRL)','2023',134.00),('Bitcoin (BRL)','2024',180.00),
  ('Poupança','2019',4.26),('Poupança','2020',2.11),('Poupança','2021',2.99),('Poupança','2022',7.90),('Poupança','2023',8.03),('Poupança','2024',7.07),
  ('IPCA','2019',4.31),('IPCA','2020',4.52),('IPCA','2021',10.06),('IPCA','2022',5.79),('IPCA','2023',4.62),('IPCA','2024',4.83)
) AS v(name, period, ret) ON v.name = a.name
ON CONFLICT (asset_id, period) DO NOTHING;
