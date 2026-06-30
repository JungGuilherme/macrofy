-- Add file_url column to articles if it doesn't exist
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS file_url text;

-- Add file_url column to recommendations if it doesn't exist  
ALTER TABLE public.recommendations 
ADD COLUMN IF NOT EXISTS file_url text;