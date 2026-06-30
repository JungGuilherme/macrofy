
CREATE TABLE public.fedwatch_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_range text NOT NULL,
  probability numeric NOT NULL,
  meeting_date text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fedwatch_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fedwatch cache"
ON public.fedwatch_cache FOR SELECT
USING (true);

CREATE POLICY "Service role can manage fedwatch cache"
ON public.fedwatch_cache FOR ALL
USING (true)
WITH CHECK (true);
