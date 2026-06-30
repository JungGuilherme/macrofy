
CREATE TABLE public.rss_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid DEFAULT NULL
);

ALTER TABLE public.rss_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rss_feeds" ON public.rss_feeds
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone authenticated can view rss_feeds" ON public.rss_feeds
  FOR SELECT TO authenticated
  USING (true);
