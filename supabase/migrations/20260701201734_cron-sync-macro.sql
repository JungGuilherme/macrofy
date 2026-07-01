-- Schedule daily macro sync jobs using pg_cron + pg_net
-- Both extensions are already enabled (see migration 20260313201350).
--
-- The SYNC_SECRET value must be stored as a Postgres setting before these
-- jobs can authenticate with the Edge Functions.  Run once in the Supabase
-- SQL editor (NOT in a migration, to avoid leaking the secret in git):
--
--   ALTER DATABASE postgres SET app.sync_secret = '<your-secret>';
--
-- The Edge Functions check for the header x-sync-secret matching SYNC_SECRET.

DO $$
DECLARE
  project_url text := 'https://dmbmlqfucquspiruvuam.supabase.co';
BEGIN

  -- BCB series (IPCA, Selic, IBC-Br, PNAD, CAGED, câmbio …)
  -- Run at 07:00 UTC every day
  PERFORM cron.schedule(
    'sync-macro-bcb-daily',
    '0 7 * * *',
    format($q$
      SELECT extensions.http_post(
        url      := %L,
        body     := '{}',
        headers  := jsonb_build_object(
          'Content-Type',  'application/json',
          'x-sync-secret', current_setting('app.sync_secret', true)
        )
      );
    $q$, project_url || '/functions/v1/sync-macro-bcb')
  );

  -- FRED series (CPI, PCE, payroll, GDP …)
  -- Run at 07:10 UTC every day
  PERFORM cron.schedule(
    'sync-macro-fred-daily',
    '10 7 * * *',
    format($q$
      SELECT extensions.http_post(
        url      := %L,
        body     := '{}',
        headers  := jsonb_build_object(
          'Content-Type',  'application/json',
          'x-sync-secret', current_setting('app.sync_secret', true)
        )
      );
    $q$, project_url || '/functions/v1/sync-macro-fred')
  );

  -- Global snapshot (aggregates BCB + FRED + World Bank into macro_global_snapshot)
  -- Run at 07:30 UTC every day (after BCB and FRED have finished)
  PERFORM cron.schedule(
    'sync-macro-global-daily',
    '30 7 * * *',
    format($q$
      SELECT extensions.http_post(
        url      := %L,
        body     := '{}',
        headers  := jsonb_build_object(
          'Content-Type',  'application/json',
          'x-sync-secret', current_setting('app.sync_secret', true)
        )
      );
    $q$, project_url || '/functions/v1/sync-macro-global')
  );

END;
$$;
