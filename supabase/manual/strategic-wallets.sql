-- Carteiras recomendadas (materiais estratégicos, asset allocation, offshore, previdência)
-- ⚠️ O banco é Lovable Cloud: cole este arquivo inteiro no chat do Lovable
-- pedindo "run this SQL in my database".

CREATE TABLE IF NOT EXISTS public.strategic_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  label text NOT NULL,
  pdf_url text,
  sort_order integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category, label)
);

ALTER TABLE public.strategic_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read strategic wallets" ON public.strategic_wallets;
DROP POLICY IF EXISTS "Admins manage strategic wallets" ON public.strategic_wallets;

CREATE POLICY "Authenticated can read strategic wallets"
  ON public.strategic_wallets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage strategic wallets"
  ON public.strategic_wallets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.strategic_wallets (category, label, sort_order) VALUES
  ('materiais_estrategicos', 'Carta', 1),
  ('materiais_estrategicos', 'Relatório de Alocação', 2),
  ('materiais_estrategicos', 'Tabela Periódica', 3),
  ('asset_allocation', 'Fee Based', 4),
  ('asset_allocation', 'Commission Based', 5),
  ('carteiras_offshore', 'Perfil 1', 6),
  ('carteiras_offshore', 'Perfil 2', 7),
  ('carteiras_offshore', 'Perfil 3', 8),
  ('carteiras_offshore', 'Perfil 4', 9),
  ('carteiras_offshore', 'Perfil 5', 10),
  ('carteiras_previdencia', 'Qualificado', 11),
  ('carteiras_previdencia', 'Geral', 12)
ON CONFLICT (category, label) DO NOTHING;
