CREATE TABLE public.anbima_snapshots (
  data_referencia date NOT NULL,
  tipo text NOT NULL,
  vencimento date NOT NULL,
  taxa numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (data_referencia, tipo, vencimento)
);

GRANT SELECT ON public.anbima_snapshots TO authenticated;
GRANT ALL ON public.anbima_snapshots TO service_role;

ALTER TABLE public.anbima_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view anbima snapshots"
ON public.anbima_snapshots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manages anbima snapshots"
ON public.anbima_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_anbima_snapshots_tipo_data ON public.anbima_snapshots (tipo, data_referencia DESC);