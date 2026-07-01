-- Add CAGED and USD/BRL exchange rate to macro_series_metadata
-- CAGED: saldo de empregos celetistas (BCB SGS 28763)
-- Câmbio USD/BRL: taxa de câmbio livre venda fim de período (BCB SGS 1)

INSERT INTO public.macro_series_metadata
  (country, category, indicator, source, series_code, unit, frequency, default_mode, polarity, sort_order, enabled, notes)
VALUES
  ('BR', 'Trabalho',        'CAGED (saldo)',     'BCB', '28763', 'empregos', 'monthly', 'level', 'positive', 32, true,
   'Saldo de empregos celetistas — Cadastro Geral de Empregados e Desempregados'),
  ('BR', 'Fiscal/Externo',  'Câmbio USD/BRL',   'BCB', '1',     'USD/BRL',  'monthly', 'level', 'negative', 41, true,
   'Taxa de câmbio livre — Dólar americano (venda) — fim de período')
ON CONFLICT (country, series_code) DO NOTHING;
