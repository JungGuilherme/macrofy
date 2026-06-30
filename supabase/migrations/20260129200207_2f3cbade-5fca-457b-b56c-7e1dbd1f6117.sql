-- Create enum for alert types
CREATE TYPE public.alert_type AS ENUM ('attention', 'content', 'event', 'market');

-- Create enum for time hints
CREATE TYPE public.time_hint AS ENUM ('hoje', 'amanha', 'semana');

-- Alter house_alerts table to add new fields
ALTER TABLE public.house_alerts 
ADD COLUMN IF NOT EXISTS type alert_type NOT NULL DEFAULT 'content',
ADD COLUMN IF NOT EXISTS url text,
ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS time_hint time_hint;

-- Rename 'text' column to 'title' for clarity
ALTER TABLE public.house_alerts RENAME COLUMN text TO title;

-- Drop old priority column since we now use type and is_pinned
ALTER TABLE public.house_alerts DROP COLUMN IF EXISTS priority;