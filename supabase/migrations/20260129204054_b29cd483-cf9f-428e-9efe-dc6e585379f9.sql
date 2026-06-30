-- Add expires_at and display_order columns to house_alerts
ALTER TABLE public.house_alerts 
ADD COLUMN IF NOT EXISTS expires_at date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Initialize display_order based on created_at sequence
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.house_alerts
)
UPDATE public.house_alerts 
SET display_order = ordered.rn
FROM ordered
WHERE public.house_alerts.id = ordered.id;

COMMENT ON COLUMN public.house_alerts.expires_at IS 'Date after which the alert will no longer appear. NULL means never expires.';
COMMENT ON COLUMN public.house_alerts.display_order IS 'Display order for manual sorting. Lower values appear first.';