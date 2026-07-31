-- Bootstrap: permite rodar migrações de banco direto por aqui (scripts/run-sql-migration.mjs),
-- sem depender do chat do Lovable para futuras mudanças de schema.
-- ⚠️ Cole este arquivo UMA ÚLTIMA VEZ no chat do Lovable pedindo "run this SQL in my database".
--
-- ATENÇÃO — trade-off de segurança: esta função dá a QUALQUER usuário com papel
-- 'admin' o poder de executar SQL arbitrário no banco (criar/alterar/apagar tabelas,
-- ignorar RLS, etc.) através de uma chamada de API normal. Isso é equivalente ao
-- acesso que o chat do Lovable já tem — não é um acesso novo, é o MESMO acesso,
-- só que acionável pelo GitHub Actions/scripts em vez de precisar colar no chat.
-- Se as credenciais ADMIN_EMAIL/ADMIN_PASSWORD vazarem, quem as tiver controla o
-- banco inteiro (isso já era verdade antes, via login admin + RLS "FOR ALL"; aqui
-- fica mais direto, sem precisar de uma tabela específica).

CREATE OR REPLACE FUNCTION public.admin_run_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  EXECUTE sql;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_run_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_run_sql(text) TO authenticated;
