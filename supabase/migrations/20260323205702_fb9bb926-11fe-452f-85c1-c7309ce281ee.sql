
CREATE TABLE public.brasil_pe_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  pe_ratio numeric NOT NULL,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE(date)
);

ALTER TABLE public.brasil_pe_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view brasil_pe_historico"
  ON public.brasil_pe_historico FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage brasil_pe_historico"
  ON public.brasil_pe_historico FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.brasil_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  foreign_flow numeric NOT NULL DEFAULT 0,
  institutional_flow numeric NOT NULL DEFAULT 0,
  retail_flow numeric NOT NULL DEFAULT 0,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE(date)
);

ALTER TABLE public.brasil_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view brasil_flows"
  ON public.brasil_flows FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage brasil_flows"
  ON public.brasil_flows FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
