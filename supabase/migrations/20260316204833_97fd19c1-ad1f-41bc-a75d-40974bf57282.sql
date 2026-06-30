ALTER TABLE public.rss_feeds ADD COLUMN IF NOT EXISTS theme text DEFAULT NULL;
COMMENT ON COLUMN public.rss_feeds.theme IS 'Theme/tab name to group multiple feeds under the same tab';