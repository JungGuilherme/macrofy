-- One-shot backfill for macro_cycle_history (Ciclos Macro).
--
-- inflacao_implicita_1a values were computed OUTSIDE the database (Node
-- script, verified against real Tesouro Transparente CSV data with a
-- near-maturity noise filter — see supabase/functions/sync-macro-cycle for
-- the same method) because Postgres can't fetch that CSV itself.
--
-- growth_composite IS computed here, server-side, from macro_heatmap_data
-- (already populated by sync-macro-bcb) — same 5-series average as the edge
-- function uses. Run via the existing "Run SQL Migration" GitHub Action
-- (file: supabase/manual/backfill-macro-cycle.sql), same as any other
-- supabase/manual/*.sql script.
WITH inputs(date, inflacao_implicita_1a) AS (
  VALUES
    ('2015-01-31'::date, 6.59),
    ('2015-02-28'::date, 6.64),
    ('2015-03-31'::date, 6.77),
    ('2015-04-30'::date, 6.21),
    ('2015-05-31'::date, 6.59),
    ('2015-06-30'::date, 6.84),
    ('2015-07-31'::date, 6.36),
    ('2015-08-31'::date, 6.42),
    ('2015-09-30'::date, 7.89),
    ('2015-10-31'::date, 8.46),
    ('2015-11-30'::date, 8.37),
    ('2015-12-31'::date, 8.56),
    ('2016-01-31'::date, 8.03),
    ('2016-02-29'::date, 7.28),
    ('2016-03-31'::date, 6.38),
    ('2016-04-30'::date, 6.41),
    ('2016-05-31'::date, 6.48),
    ('2016-06-30'::date, 6.17),
    ('2016-07-31'::date, 5.82),
    ('2016-08-31'::date, 6.05),
    ('2016-09-30'::date, 5.53),
    ('2016-10-31'::date, 5.28),
    ('2016-11-30'::date, 5.56),
    ('2016-12-31'::date, 5.3),
    ('2017-01-31'::date, 4.87),
    ('2017-02-28'::date, 4.58),
    ('2017-03-31'::date, 4.55),
    ('2017-04-30'::date, 4.42),
    ('2017-05-31'::date, 4.09),
    ('2017-06-30'::date, 3.92),
    ('2017-07-31'::date, 4.39),
    ('2017-08-31'::date, 4.2),
    ('2017-09-30'::date, 4.12),
    ('2017-10-31'::date, 4.31),
    ('2017-11-30'::date, 4.1),
    ('2017-12-31'::date, 4.04),
    ('2018-01-31'::date, 4.14),
    ('2018-02-28'::date, 3.96),
    ('2018-03-31'::date, 4.15),
    ('2018-04-30'::date, 4.29),
    ('2018-05-31'::date, 4.49),
    ('2018-06-30'::date, 4.4),
    ('2018-07-31'::date, 4.32),
    ('2018-08-31'::date, 4.96),
    ('2018-09-30'::date, 5.28),
    ('2018-10-31'::date, 4.3),
    ('2018-11-30'::date, 3.31),
    ('2018-12-31'::date, 3.4),
    ('2019-01-31'::date, 3.65),
    ('2019-02-28'::date, 3.81),
    ('2019-03-31'::date, 3.79),
    ('2019-04-30'::date, 3.78),
    ('2019-05-31'::date, 3.39),
    ('2019-06-30'::date, 3.38),
    ('2019-07-31'::date, 3.37),
    ('2019-08-31'::date, 3.36),
    ('2019-09-30'::date, 3.35),
    ('2019-10-31'::date, 3.72),
    ('2019-11-30'::date, 4.66),
    ('2019-12-31'::date, 4.44),
    ('2020-01-31'::date, 2.79),
    ('2020-02-29'::date, 1.94),
    ('2020-03-31'::date, 0.51),
    ('2020-04-30'::date, 0.22),
    ('2020-05-31'::date, 0.73),
    ('2020-06-30'::date, 0.82),
    ('2020-07-31'::date, 1.36),
    ('2020-08-31'::date, 1.42),
    ('2020-09-30'::date, 1.27),
    ('2020-10-31'::date, 1.34),
    ('2020-11-30'::date, 1.3),
    ('2020-12-31'::date, 1.17),
    ('2021-01-31'::date, 1.4),
    ('2021-02-28'::date, 1.55),
    ('2021-03-31'::date, 1.99),
    ('2021-04-30'::date, 2.46),
    ('2021-05-31'::date, 2.88),
    ('2021-06-30'::date, 2.94),
    ('2021-07-31'::date, 4.02),
    ('2021-08-31'::date, 4.22),
    ('2021-09-30'::date, 4.66),
    ('2021-10-31'::date, 6.37),
    ('2021-11-30'::date, 6.48),
    ('2021-12-31'::date, 6.3),
    ('2022-01-31'::date, 6.25),
    ('2022-02-28'::date, 6.3),
    ('2022-03-31'::date, 7.05),
    ('2022-04-30'::date, 7.02),
    ('2022-05-31'::date, 6.85),
    ('2022-06-30'::date, 6.94),
    ('2022-07-31'::date, 5.98),
    ('2022-08-31'::date, 5.46),
    ('2022-09-30'::date, 5.25),
    ('2022-10-31'::date, 6.06),
    ('2022-11-30'::date, 6.22),
    ('2022-12-31'::date, 6.01),
    ('2023-01-31'::date, 6.43),
    ('2023-02-28'::date, 6.47),
    ('2023-03-31'::date, 5.93),
    ('2023-04-30'::date, 5.65),
    ('2023-05-31'::date, 4.23),
    ('2023-06-30'::date, 4.01),
    ('2023-07-31'::date, 4.15),
    ('2023-08-31'::date, 4.03),
    ('2023-09-30'::date, 4.4),
    ('2023-10-31'::date, 4.18),
    ('2023-11-30'::date, 3.73),
    ('2023-12-31'::date, 3.22),
    ('2024-01-31'::date, 3.47),
    ('2024-02-29'::date, 4.05),
    ('2024-03-31'::date, 3.9),
    ('2024-04-30'::date, 3.85),
    ('2024-05-31'::date, 4.09),
    ('2024-06-30'::date, 4.24),
    ('2024-07-31'::date, 4.71),
    ('2024-08-31'::date, 4.73),
    ('2024-09-30'::date, 5.17),
    ('2024-10-31'::date, 5.4),
    ('2024-11-30'::date, 6.23),
    ('2024-12-31'::date, 6.83),
    ('2025-01-31'::date, 6.61),
    ('2025-02-28'::date, 6.33),
    ('2025-03-31'::date, 5.32),
    ('2025-04-30'::date, 4.93),
    ('2025-05-31'::date, 4.7),
    ('2025-06-30'::date, 4.21),
    ('2025-07-31'::date, 3.72),
    ('2025-08-31'::date, 3.71),
    ('2025-09-30'::date, 4),
    ('2025-10-31'::date, 3.55),
    ('2025-11-30'::date, 3.4),
    ('2025-12-31'::date, 3.45),
    ('2026-01-31'::date, 3.2),
    ('2026-02-28'::date, 5.16),
    ('2026-03-31'::date, 5.71),
    ('2026-04-30'::date, 5.61),
    ('2026-05-31'::date, 5.51),
    ('2026-06-30'::date, 5),
    ('2026-07-31'::date, 5.21)
),
growth AS (
  SELECT
    i.date,
    (
      SELECT AVG(hs.heat_score)
      FROM (
        SELECT DISTINCT ON (m.series_code) m.heat_score
        FROM macro_heatmap_data m
        WHERE m.country = 'BR'
          AND m.series_code IN ('24364', '20539', '24382', '24369', '25351')
          AND m.heat_score IS NOT NULL
          AND m.date <= i.date
        ORDER BY m.series_code, m.date DESC
      ) hs
    ) AS growth_composite,
    (
      SELECT COUNT(*)
      FROM (
        SELECT DISTINCT ON (m.series_code) m.heat_score
        FROM macro_heatmap_data m
        WHERE m.country = 'BR'
          AND m.series_code IN ('24364', '20539', '24382', '24369', '25351')
          AND m.heat_score IS NOT NULL
          AND m.date <= i.date
        ORDER BY m.series_code, m.date DESC
      ) hs2
    ) AS growth_series_count
  FROM inputs i
),
combined AS (
  SELECT
    i.date,
    i.inflacao_implicita_1a,
    g.growth_composite,
    g.growth_series_count,
    LAG(g.growth_composite) OVER (ORDER BY i.date) AS prev_growth,
    LAG(i.inflacao_implicita_1a) OVER (ORDER BY i.date) AS prev_infl
  FROM inputs i
  JOIN growth g ON g.date = i.date
),
classified AS (
  SELECT
    date,
    inflacao_implicita_1a,
    growth_composite,
    growth_series_count,
    CASE WHEN growth_composite IS NULL THEN NULL ELSE
      CASE
        WHEN (CASE WHEN prev_growth IS NOT NULL THEN growth_composite >= prev_growth ELSE growth_composite >= 0 END)
             AND NOT (CASE WHEN prev_infl IS NOT NULL THEN inflacao_implicita_1a >= prev_infl ELSE FALSE END)
          THEN 'Goldilocks'
        WHEN (CASE WHEN prev_growth IS NOT NULL THEN growth_composite >= prev_growth ELSE growth_composite >= 0 END)
             AND (CASE WHEN prev_infl IS NOT NULL THEN inflacao_implicita_1a >= prev_infl ELSE FALSE END)
          THEN 'Reflação'
        WHEN NOT (CASE WHEN prev_growth IS NOT NULL THEN growth_composite >= prev_growth ELSE growth_composite >= 0 END)
             AND (CASE WHEN prev_infl IS NOT NULL THEN inflacao_implicita_1a >= prev_infl ELSE FALSE END)
          THEN 'Estagflação'
        ELSE 'Deflação'
      END
    END AS quadrante
  FROM combined
)
INSERT INTO macro_cycle_history
  (country, date, growth_composite, growth_series_count, inflacao_implicita_1a, inflacao_vertice, quadrante, computed_at)
SELECT
  'BR', date, growth_composite, growth_series_count, inflacao_implicita_1a, NULL, quadrante, now()
FROM classified
ON CONFLICT (country, date) DO UPDATE SET
  growth_composite = EXCLUDED.growth_composite,
  growth_series_count = EXCLUDED.growth_series_count,
  inflacao_implicita_1a = EXCLUDED.inflacao_implicita_1a,
  quadrante = EXCLUDED.quadrante,
  computed_at = EXCLUDED.computed_at;
