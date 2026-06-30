-- Add hidden flag and display_order to theme labels for ordering and hiding
ALTER TABLE public.news_theme_labels
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Allow rows to exist without a custom label (just for hide/order settings)
ALTER TABLE public.news_theme_labels
  ALTER COLUMN label DROP NOT NULL;