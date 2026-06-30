
-- 1) Remove broad admin "manage all" policy on cache tables.
-- Cache writes must come from service_role only (edge functions). Admin reads
-- are still allowed by the existing "Authenticated can read ..." SELECT policies.
DROP POLICY IF EXISTS "Admins can manage copom cache" ON public.copom_cache;
DROP POLICY IF EXISTS "Admins can manage fedwatch cache" ON public.fedwatch_cache;

-- 2) Restrict rss_feeds.feed_url exposure.
-- Drop the broad authenticated-read policy. Only admins (via existing
-- "Admins can manage rss_feeds" ALL policy) can SELECT the table directly.
-- A SECURITY DEFINER RPC exposes the non-secret columns for normal users.
DROP POLICY IF EXISTS "Anyone authenticated can view rss_feeds" ON public.rss_feeds;

CREATE OR REPLACE FUNCTION public.list_rss_feeds_public()
RETURNS TABLE (
  id uuid,
  name text,
  items jsonb,
  display_order int,
  created_at timestamptz,
  theme text,
  themes news_theme[],
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, items, display_order, created_at, theme, themes, is_active
  FROM public.rss_feeds
  ORDER BY display_order ASC;
$$;

REVOKE ALL ON FUNCTION public.list_rss_feeds_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_rss_feeds_public() TO authenticated;
