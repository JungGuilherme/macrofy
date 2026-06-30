-- 1. Fix curated_news admin policy: scope to authenticated role
DROP POLICY IF EXISTS "Admins can manage curated_news" ON public.curated_news;
CREATE POLICY "Admins can manage curated_news"
ON public.curated_news
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Revoke EXECUTE on trigger-only SECURITY DEFINER functions from API roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Revoke has_role / get_user_role from anon (kept for authenticated since RLS uses them)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;

-- 3. Restrict listing of documents bucket to admins
-- Public-URL access still works (public bucket); this only locks the storage list/get API.
DROP POLICY IF EXISTS "Anyone authenticated can read documents" ON storage.objects;
CREATE POLICY "Admins can list documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'::app_role));
