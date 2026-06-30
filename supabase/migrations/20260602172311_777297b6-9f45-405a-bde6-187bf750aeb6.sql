
-- 1) Drop role/is_admin from profiles (roles live in user_roles)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;

-- 2) Explicit admin-only write policies on macro_global_snapshot
CREATE POLICY "Admins can manage macro_global_snapshot"
ON public.macro_global_snapshot
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage macro_global_snapshot"
ON public.macro_global_snapshot
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3) Force feedback_suggestions.user_name from profile (no impersonation)
CREATE OR REPLACE FUNCTION public.set_feedback_user_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  SELECT name INTO NEW.user_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_feedback_user_name ON public.feedback_suggestions;
CREATE TRIGGER trg_set_feedback_user_name
BEFORE INSERT ON public.feedback_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.set_feedback_user_name();

REVOKE EXECUTE ON FUNCTION public.set_feedback_user_name() FROM PUBLIC, anon, authenticated;
