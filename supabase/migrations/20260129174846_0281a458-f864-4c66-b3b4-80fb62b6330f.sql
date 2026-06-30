-- Add content_html column to recommendations table
ALTER TABLE public.recommendations 
ADD COLUMN IF NOT EXISTS content_html text;

-- Add external_link column to recommendations table  
ALTER TABLE public.recommendations 
ADD COLUMN IF NOT EXISTS external_link text;

-- Create RLS policies for curated_news table
-- Enable RLS
ALTER TABLE public.curated_news ENABLE ROW LEVEL SECURITY;

-- Admins can manage all curated news
CREATE POLICY "Admins can manage curated_news" 
ON public.curated_news 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- AAI users can view active curated news
CREATE POLICY "AAI can view active curated_news" 
ON public.curated_news 
FOR SELECT 
USING (is_active = true AND has_role(auth.uid(), 'aai'::app_role));