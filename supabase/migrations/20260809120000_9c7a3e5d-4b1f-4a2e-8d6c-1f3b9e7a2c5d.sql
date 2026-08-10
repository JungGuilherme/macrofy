
-- Macro Ciclos: um ponto/dia com o composto de crescimento (heat_score médio
-- de séries BCB já sincronizadas por sync-macro-bcb) contra a inflação
-- implícita 1A (vértice NTN-B mais próximo de hoje+1 ano, via ANBIMA).
-- Alimentado por supabase/functions/sync-macro-cycle. Histórico acumula a
-- partir do primeiro run — não há backfill de inflação implícita porque a
-- ANBIMA só expõe o dia corrente, não série histórica.
CREATE TABLE public.macro_cycle_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL DEFAULT 'BR',
  date date NOT NULL,
  growth_composite numeric,
  growth_series_count integer,
  inflacao_implicita_1a numeric,
  inflacao_vertice date,
  quadrante text,
  computed_at timestamptz DEFAULT now(),
  UNIQUE(country, date)
);

CREATE INDEX idx_macro_cycle_country_date ON public.macro_cycle_history(country, date);

ALTER TABLE public.macro_cycle_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view macro cycle" ON public.macro_cycle_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage macro cycle" ON public.macro_cycle_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
