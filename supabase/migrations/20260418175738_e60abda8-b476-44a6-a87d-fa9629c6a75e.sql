-- Enum de temas fixos
DO $$ BEGIN
  CREATE TYPE public.news_theme AS ENUM (
    'macro','brasil','eua','politica','empresas','juros','inflacao',
    'fiscal','internacional','commodities','mercados','cripto','outros'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- rss_feeds: adicionar themes[] e is_active
ALTER TABLE public.rss_feeds
  ADD COLUMN IF NOT EXISTS themes public.news_theme[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Migrar valores antigos do campo `theme` (text) para themes[] quando bater no enum
UPDATE public.rss_feeds
SET themes = ARRAY[lower(theme)::public.news_theme]
WHERE (themes IS NULL OR array_length(themes,1) IS NULL)
  AND theme IS NOT NULL
  AND lower(theme) IN ('macro','brasil','eua','politica','empresas','juros','inflacao','fiscal','internacional','commodities','mercados','cripto','outros');

-- curated_news: novos campos
ALTER TABLE public.curated_news
  ADD COLUMN IF NOT EXISTS themes public.news_theme[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz NOT NULL DEFAULT now();

-- Backfill published_at a partir de published_date quando aplicável
UPDATE public.curated_news
SET published_at = published_date::timestamptz
WHERE published_at IS NULL OR published_at = created_at;

-- Ajustar policy SELECT em curated_news: hoje só admin e aai veem.
-- Permitir qualquer autenticado ler ativas.
DROP POLICY IF EXISTS "AAI can view active curated_news" ON public.curated_news;
CREATE POLICY "Authenticated can view active curated_news"
ON public.curated_news
FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_rss_feeds_themes ON public.rss_feeds USING GIN (themes);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_is_active ON public.rss_feeds (is_active);
CREATE INDEX IF NOT EXISTS idx_curated_news_themes ON public.curated_news USING GIN (themes);
CREATE INDEX IF NOT EXISTS idx_curated_news_featured ON public.curated_news (is_featured);
CREATE INDEX IF NOT EXISTS idx_curated_news_published_at ON public.curated_news (published_at DESC);