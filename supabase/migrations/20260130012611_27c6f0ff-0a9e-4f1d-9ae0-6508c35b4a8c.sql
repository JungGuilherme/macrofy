-- Create table for economic data (dados econômicos)
CREATE TABLE public.agenda_economica (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_date DATE NOT NULL,
  event_time TIME NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NULL
);

-- Create table for earnings/results (resultados/balanços)
CREATE TABLE public.agenda_resultados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_date DATE NOT NULL,
  company TEXT NOT NULL,
  ticker TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  event_time TEXT NULL, -- Can be HH:MM or BMO/AMC
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NULL
);

-- Create table for dividends (dividendos)
CREATE TABLE public.agenda_dividendos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_date DATE NOT NULL,
  company TEXT NOT NULL,
  ticker TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  dividend_type TEXT NOT NULL DEFAULT 'Dividendo', -- Dividendo or JCP
  dividend_yield NUMERIC(5,2) NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NULL
);

-- Enable RLS on all tables
ALTER TABLE public.agenda_economica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_dividendos ENABLE ROW LEVEL SECURITY;

-- RLS policies for agenda_economica
CREATE POLICY "Anyone authenticated can view agenda_economica"
ON public.agenda_economica FOR SELECT
USING (true);

CREATE POLICY "Admins can manage agenda_economica"
ON public.agenda_economica FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for agenda_resultados
CREATE POLICY "Anyone authenticated can view agenda_resultados"
ON public.agenda_resultados FOR SELECT
USING (true);

CREATE POLICY "Admins can manage agenda_resultados"
ON public.agenda_resultados FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for agenda_dividendos
CREATE POLICY "Anyone authenticated can view agenda_dividendos"
ON public.agenda_dividendos FOR SELECT
USING (true);

CREATE POLICY "Admins can manage agenda_dividendos"
ON public.agenda_dividendos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));