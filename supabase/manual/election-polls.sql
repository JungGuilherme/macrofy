-- Pesquisas eleitorais (substitui o iframe de eleicaobr.netlify.app, que
-- não é mais confiável). Admin cadastra manualmente cada pesquisa; a página
-- calcula a média por candidato/turno a partir das linhas cadastradas.
-- Apply via: node scripts/run-sql-migration.mjs supabase/manual/election-polls.sql
-- (ou pelo workflow "Run SQL Migration" no GitHub Actions)

CREATE TABLE IF NOT EXISTS public.election_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round smallint NOT NULL CHECK (round IN (1, 2)),
  institute text NOT NULL,
  commissioned_by text,
  survey_date date NOT NULL,
  sample_size integer,
  margin_error numeric,
  source_url text,
  candidates jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.election_polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view election polls" ON public.election_polls;
DROP POLICY IF EXISTS "Admins manage election polls" ON public.election_polls;

CREATE POLICY "Staff can view election polls"
  ON public.election_polls FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins manage election polls"
  ON public.election_polls FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
