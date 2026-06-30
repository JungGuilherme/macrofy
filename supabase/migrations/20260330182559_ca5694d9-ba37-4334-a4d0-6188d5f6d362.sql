ALTER TABLE public.b3_flow_daily ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.b3_flow_daily ADD COLUMN IF NOT EXISTS source text DEFAULT 'dadosdemercado';