-- Add ex_date column to agenda_dividendos (optional field for ex-dividend date)
ALTER TABLE public.agenda_dividendos 
ADD COLUMN ex_date date NULL;