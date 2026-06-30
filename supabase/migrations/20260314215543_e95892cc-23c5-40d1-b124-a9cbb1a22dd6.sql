
INSERT INTO public.macro_series_metadata (country, category, indicator, source, series_code, unit, frequency, default_mode, polarity, sort_order, enabled, notes)
VALUES
  ('US', 'Política Monetária', 'Fed Funds Target Upper', 'FRED', 'DFEDTARU', '%', 'daily', 'level', 'neutral', 200, true, 'Federal Funds Target Rate Upper Limit'),
  ('US', 'Política Monetária', 'Fed Funds Target Lower', 'FRED', 'DFEDTARL', '%', 'daily', 'level', 'neutral', 201, true, 'Federal Funds Target Rate Lower Limit')
ON CONFLICT DO NOTHING;
