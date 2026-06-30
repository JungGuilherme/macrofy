
CREATE TABLE public.b3_flow_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  foreign_flow numeric DEFAULT 0,
  institutional numeric DEFAULT 0,
  financial_institutions numeric DEFAULT 0,
  individual numeric DEFAULT 0,
  others numeric DEFAULT 0,
  ytd_foreign numeric DEFAULT 0,
  ytd_institutional numeric DEFAULT 0,
  ytd_financial_institutions numeric DEFAULT 0,
  ytd_individual numeric DEFAULT 0,
  ytd_others numeric DEFAULT 0,
  source_file_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.b3_flow_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view b3_flow_daily"
  ON public.b3_flow_daily FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage b3_flow_daily"
  ON public.b3_flow_daily FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage b3_flow_daily"
  ON public.b3_flow_daily FOR ALL TO service_role
  USING (true) WITH CHECK (true);
