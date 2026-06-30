
-- profiles: only self
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- agenda_economica
DROP POLICY IF EXISTS "Anyone authenticated can view agenda_economica" ON public.agenda_economica;
DROP POLICY IF EXISTS "Admins can manage agenda_economica" ON public.agenda_economica;
CREATE POLICY "Authenticated can view agenda_economica" ON public.agenda_economica
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage agenda_economica" ON public.agenda_economica
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- agenda_dividendos
DROP POLICY IF EXISTS "Anyone authenticated can view agenda_dividendos" ON public.agenda_dividendos;
DROP POLICY IF EXISTS "Admins can manage agenda_dividendos" ON public.agenda_dividendos;
CREATE POLICY "Authenticated can view agenda_dividendos" ON public.agenda_dividendos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage agenda_dividendos" ON public.agenda_dividendos
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- agenda_resultados
DROP POLICY IF EXISTS "Anyone authenticated can view agenda_resultados" ON public.agenda_resultados;
DROP POLICY IF EXISTS "Admins can manage agenda_resultados" ON public.agenda_resultados;
CREATE POLICY "Authenticated can view agenda_resultados" ON public.agenda_resultados
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage agenda_resultados" ON public.agenda_resultados
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- morning_calls
DROP POLICY IF EXISTS "Anyone can view published morning calls" ON public.morning_calls;
DROP POLICY IF EXISTS "Admin can manage morning calls" ON public.morning_calls;
CREATE POLICY "Authenticated can view published morning calls" ON public.morning_calls
  FOR SELECT TO authenticated USING (is_published = true OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage morning calls" ON public.morning_calls
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- copom_cache
DROP POLICY IF EXISTS "Anyone can read copom cache" ON public.copom_cache;
CREATE POLICY "Authenticated can read copom cache" ON public.copom_cache
  FOR SELECT TO authenticated USING (true);

-- fedwatch_cache
DROP POLICY IF EXISTS "Anyone can read fedwatch cache" ON public.fedwatch_cache;
CREATE POLICY "Authenticated can read fedwatch cache" ON public.fedwatch_cache
  FOR SELECT TO authenticated USING (true);

-- course-files bucket: make private and require authenticated reads
UPDATE storage.buckets SET public = false WHERE id = 'course-files';
DROP POLICY IF EXISTS "Anyone can view course files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view course files" ON storage.objects;
CREATE POLICY "Authenticated can view course files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'course-files');

-- Revoke execute on trigger-only functions
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
