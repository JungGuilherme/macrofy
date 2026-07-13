-- Cache de cotações (Yahoo Finance via GitHub Actions, a cada 15 min)
-- ⚠️ Banco Lovable Cloud: cole no chat do Lovable pedindo "run this SQL".

CREATE TABLE IF NOT EXISTS public.market_quotes (
  symbol text PRIMARY KEY,
  name text NOT NULL,
  price numeric NOT NULL,
  change numeric NOT NULL DEFAULT 0,
  change_percent numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.market_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read market quotes" ON public.market_quotes;
DROP POLICY IF EXISTS "Admins manage market quotes" ON public.market_quotes;

CREATE POLICY "Authenticated can read market quotes"
  ON public.market_quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage market quotes"
  ON public.market_quotes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
