-- Add content_html to curated_news for rich text support
ALTER TABLE public.curated_news 
ADD COLUMN IF NOT EXISTS content_html text;

-- Add subtitle to reports
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS subtitle text;

-- Add materials jsonb array to reports for multiple named links
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]'::jsonb;

-- Add attachments_placeholder for future file uploads
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS attachments_placeholder jsonb DEFAULT '{"enabled": false, "notes": "future file uploads"}'::jsonb;

-- Add subtitle to articles  
ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS subtitle text;

-- Note: content_html, external_link, external_url, file_url columns already exist on recommendations, articles, and reports from previous migrations