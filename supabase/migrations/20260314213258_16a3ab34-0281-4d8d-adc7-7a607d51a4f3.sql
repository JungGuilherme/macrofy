
CREATE TABLE IF NOT EXISTS public.macro_global_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  country_name text NOT NULL,
  flag text,
  gdp_yoy numeric,
  gdp_qoq numeric,
  cpi_yoy numeric,
  core_cpi_yoy numeric,
  policy_rate numeric,
  ten_y_yield numeric,
  unemployment numeric,
  current_account_gdp numeric,
  govt_debt_gdp numeric,
  source text DEFAULT 'manual',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(country_code)
);

ALTER TABLE public.macro_global_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read global snapshot" ON public.macro_global_snapshot
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.macro_global_snapshot (country_code, country_name, flag, gdp_yoy, gdp_qoq, cpi_yoy, core_cpi_yoy, policy_rate, ten_y_yield, unemployment, current_account_gdp, govt_debt_gdp, source) VALUES
('USA', 'United States', '🇺🇸', 2.0, 0.7, 2.4, 2.5, 3.75, 4.28, 4.4, -3.9, 124.3, 'fred'),
('XC', 'Euro Area', '🇪🇺', 1.2, 0.2, 1.9, 2.4, 2.15, null, 6.1, 1.6, 87.1, 'dbnomics'),
('CHN', 'China', '🇨🇳', 4.5, 1.2, 1.3, 1.8, 3.0, 1.81, 5.1, 2.2, 88.3, 'dbnomics'),
('JPN', 'Japan', '🇯🇵', 0.1, 0.3, 1.5, 2.0, 0.75, 2.25, 2.7, 4.7, 263.0, 'dbnomics'),
('DEU', 'Germany', '🇩🇪', 0.4, 0.3, 1.9, 2.5, 2.15, null, 3.5, 5.8, 62.2, 'dbnomics'),
('GBR', 'United Kingdom', '🇬🇧', 1.0, 0.1, 3.0, 3.1, 3.75, 4.77, 4.5, -2.2, 93.6, 'dbnomics'),
('FRA', 'France', '🇫🇷', 1.2, 0.2, 0.9, 0.9, 2.15, 3.68, 7.9, 0.1, 113.0, 'dbnomics'),
('IND', 'India', '🇮🇳', 7.8, 2.0, 3.2, null, 5.25, 6.68, 5.0, -0.6, 81.9, 'dbnomics'),
('ITA', 'Italy', '🇮🇹', 0.8, 0.3, 1.6, 2.4, 2.15, 3.79, 5.1, 1.2, 137.1, 'dbnomics'),
('BRA', 'Brazil', '🇧🇷', 1.8, 0.1, 3.8, 4.7, 14.25, 14.31, 5.4, -3.0, 76.5, 'bcb'),
('CAN', 'Canada', '🇨🇦', 0.7, -0.2, 2.3, 2.6, 2.25, 3.51, 6.7, -1.4, 110.8, 'dbnomics'),
('KOR', 'South Korea', '🇰🇷', 1.6, -0.2, 2.0, 2.5, 2.50, 3.68, 3.0, 5.3, 46.8, 'dbnomics'),
('MEX', 'Mexico', '🇲🇽', 1.8, 0.9, 4.0, 4.5, 7.00, 9.47, 2.7, -0.9, 49.7, 'dbnomics'),
('AUS', 'Australia', '🇦🇺', 2.6, 0.8, 3.8, 3.4, 3.85, 5.00, 4.1, -2.9, 43.8, 'dbnomics'),
('ESP', 'Spain', '🇪🇸', 2.6, 0.8, 2.3, 2.7, 2.15, 3.50, 9.9, 3.2, 101.8, 'dbnomics'),
('CHE', 'Switzerland', '🇨🇭', 0.8, 0.2, 0.1, 0.4, 0.25, 0.43, 3.2, 5.1, 15.7, 'dbnomics'),
('TUR', 'Turkey', '🇹🇷', 3.4, 0.4, 31.5, 29.5, 37.0, 30.53, 8.1, -0.8, 24.7, 'dbnomics'),
('IDN', 'Indonesia', '🇮🇩', 5.4, 0.9, 4.8, 2.6, 4.75, 6.85, 4.7, -0.1, 38.8, 'dbnomics'),
('RUS', 'Russia', '🇷🇺', 0.6, -0.8, 5.9, 5.2, 15.5, 14.13, 2.2, 2.0, 16.4, 'dbnomics')
ON CONFLICT (country_code) DO NOTHING;
