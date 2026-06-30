CREATE TABLE IF NOT EXISTS public.news_custom_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  color_key text NOT NULL DEFAULT 'slate',
  display_order integer NOT NULL DEFAULT 0,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.news_custom_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view custom themes"
  ON public.news_custom_themes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage custom themes"
  ON public.news_custom_themes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));