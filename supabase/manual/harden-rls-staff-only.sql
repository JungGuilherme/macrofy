-- Security hardening: today ANY signed-up user (role 'aai' or 'cliente') can
-- read proprietary content, because 'cliente' is a decorative role never
-- checked by any RLS policy, and self-signup is fully open. This migration:
--
--   1. Adds public.is_staff(uid) = has_role(admin) OR has_role(aai).
--   2. Auto-assigns 'aai' to signups whose email contains "@altavistainvest"
--      (case-insensitive), 'cliente' to everyone else — no manual step needed.
--   3. Rewrites every broad "any authenticated user" SELECT policy on
--      proprietary tables to require is_staff(); admins always keep full
--      access. 'cliente' accounts (self-signup from any other domain) will
--      see empty states everywhere instead of the firm's real content.
--   4. Restores the "profiles: only self" SELECT policy that was dropped
--      (2026-05-11) and never replaced — it was a real regression, not by
--      design (comment in that migration literally said "only self").
--
-- Apply via: node scripts/run-sql-migration.mjs supabase/manual/harden-rls-staff-only.sql

CREATE OR REPLACE FUNCTION public.is_staff(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(uid, 'admin') OR public.has_role(uid, 'aai');
$$;

REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- Helper: drop every existing SELECT policy on a table, whatever it's named,
-- so the rewrite below can't silently leave an old permissive policy behind
-- (Postgres RLS ORs multiple permissive policies together).
CREATE OR REPLACE FUNCTION public._drop_select_policies(tbl text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = tbl AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public._drop_select_policies(text) FROM PUBLIC;

-- 2. Auto role assignment by email domain
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN NEW.email ILIKE '%@altavistainvest%' THEN 'aai'::public.app_role
         ELSE 'cliente'::public.app_role END
  );

  RETURN NEW;
END;
$$;

-- 3. Unconditional "any authenticated" tables → staff-only
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'macro_series_metadata', 'macro_heatmap_data', 'macro_global_snapshot',
    'brasil_pe_historico', 'brasil_flows', 'b3_flow_daily', 'market_raw_series',
    'macrofy_sentiment_components', 'macrofy_sentiment_index', 'macrofy_sentiment_config',
    'anbima_snapshots', 'copom_cache', 'fedwatch_cache',
    'agenda_economica', 'agenda_dividendos', 'agenda_resultados', 'economic_calendar',
    'courses', 'course_lessons', 'news_theme_labels', 'news_custom_themes',
    'ranking_assets', 'ranking_returns', 'strategic_wallets'
  ]
  LOOP
    PERFORM public._drop_select_policies(t);
    EXECUTE format(
      'CREATE POLICY "Staff can view %I" ON public.%I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))',
      t, t
    );
  END LOOP;
END $$;

-- 4. Published/active content: staff see published rows, admin sees everything
SELECT public._drop_select_policies('recommendations');
CREATE POLICY "Staff can view published recommendations" ON public.recommendations
  FOR SELECT TO authenticated
  USING ((is_published = true AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));

SELECT public._drop_select_policies('recommendation_materials');
CREATE POLICY "Staff can view materials for published recommendations" ON public.recommendation_materials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recommendations r
      WHERE r.id = recommendation_id
      AND ((r.is_published = true AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'))
    )
  );

SELECT public._drop_select_policies('reports');
CREATE POLICY "Staff can view published reports" ON public.reports
  FOR SELECT TO authenticated
  USING ((is_published = true AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));

SELECT public._drop_select_policies('articles');
CREATE POLICY "Staff can view published articles" ON public.articles
  FOR SELECT TO authenticated
  USING ((is_published = true AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));

SELECT public._drop_select_policies('house_alerts');
CREATE POLICY "Staff can view active alerts" ON public.house_alerts
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));

SELECT public._drop_select_policies('dashboard_embeds');
CREATE POLICY "Staff can view active embeds" ON public.dashboard_embeds
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));

SELECT public._drop_select_policies('morning_calls');
CREATE POLICY "Staff can view published morning calls" ON public.morning_calls
  FOR SELECT TO authenticated
  USING ((is_published = true AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));

SELECT public._drop_select_policies('curated_news');
CREATE POLICY "Staff can view active curated_news" ON public.curated_news
  FOR SELECT TO authenticated
  USING ((is_active = true AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));

-- 5. Restore the "profiles: only self" policy that was dropped and never
-- replaced (just id/name, low sensitivity, but honoring the original intent).
SELECT public._drop_select_policies('profiles');
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Cleanup: drop the helper, it was only needed for this migration.
DROP FUNCTION public._drop_select_policies(text);
