
-- Calendário de eventos: resultados (earnings) BR/EUA + dividendos BR.
-- Uma tabela genérica cobre os três tipos; campos específicos de cada tipo
-- ficam null quando não se aplicam (ex: payment_date só existe pra dividendo).
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('earnings', 'dividend')),
  country text NOT NULL CHECK (country IN ('BR', 'US')),
  ticker text NOT NULL,
  company_name text,
  event_date date NOT NULL, -- data do resultado, ou "data com" pro dividendo
  payment_date date, -- só dividendos
  time_of_day text, -- earnings: 'bmo' | 'amc' | null
  dividend_type text, -- só dividendos: 'Dividendos' | 'JSCP' etc
  value numeric, -- só dividendos: valor por ação
  source text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (event_type, country, ticker, event_date)
);

CREATE INDEX idx_calendar_events_date ON public.calendar_events (event_date);
CREATE INDEX idx_calendar_events_type_country ON public.calendar_events (event_type, country);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view calendar events" ON public.calendar_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage calendar events" ON public.calendar_events FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
