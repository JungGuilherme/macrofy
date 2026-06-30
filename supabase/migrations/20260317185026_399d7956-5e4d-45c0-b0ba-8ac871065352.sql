
-- Create copom_cache table
CREATE TABLE public.copom_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario text NOT NULL,
  probability numeric NOT NULL,
  meeting_date text NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.copom_cache ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can read copom cache"
  ON public.copom_cache FOR SELECT TO public
  USING (true);

-- Service role write
CREATE POLICY "Only service role can insert copom cache"
  ON public.copom_cache FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Only service role can update copom cache"
  ON public.copom_cache FOR UPDATE TO service_role
  USING (true);

CREATE POLICY "Only service role can delete copom cache"
  ON public.copom_cache FOR DELETE TO service_role
  USING (true);

-- Seed with current market expectations for March 2026 Copom meeting
INSERT INTO public.copom_cache (scenario, probability, meeting_date, updated_at) VALUES
  ('Aumento de 1,00%', 74.5, '2026-03-18', now()),
  ('Aumento de 0,75%', 15.2, '2026-03-18', now()),
  ('Aumento de 1,25%', 10.3, '2026-03-18', now());
