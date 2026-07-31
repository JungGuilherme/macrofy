-- Adiciona a seção "Lâminas" (5 perfis) à tabela strategic_wallets já existente.
-- Aplicar via: node scripts/run-sql-migration.mjs supabase/manual/strategic-wallets-laminas.sql
-- (ou pelo workflow "Run SQL Migration" no GitHub Actions)

INSERT INTO public.strategic_wallets (category, label, sort_order) VALUES
  ('laminas', 'Perfil 1', 13),
  ('laminas', 'Perfil 2', 14),
  ('laminas', 'Perfil 3', 15),
  ('laminas', 'Perfil 4', 16),
  ('laminas', 'Perfil 5', 17)
ON CONFLICT (category, label) DO NOTHING;
