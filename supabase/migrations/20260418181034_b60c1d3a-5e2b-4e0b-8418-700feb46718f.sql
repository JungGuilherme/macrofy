CREATE TABLE IF NOT EXISTS public.news_theme_labels (
  theme news_theme PRIMARY KEY,
  label text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.news_theme_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view theme labels"
  ON public.news_theme_labels FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage theme labels"
  ON public.news_theme_labels FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));