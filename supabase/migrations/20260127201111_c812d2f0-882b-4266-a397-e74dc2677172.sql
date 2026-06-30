-- Create morning_calls table for rich HTML content
CREATE TABLE public.morning_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Morning Call',
  content_html TEXT,
  published_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.morning_calls ENABLE ROW LEVEL SECURITY;

-- Everyone can read published morning calls
CREATE POLICY "Anyone can view published morning calls"
ON public.morning_calls
FOR SELECT
USING (is_published = true);

-- Admin can do everything
CREATE POLICY "Admin can manage morning calls"
ON public.morning_calls
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_morning_calls_updated_at
BEFORE UPDATE ON public.morning_calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();