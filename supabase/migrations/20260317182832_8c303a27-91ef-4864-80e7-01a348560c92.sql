
DROP POLICY "Service role can manage fedwatch cache" ON public.fedwatch_cache;

CREATE POLICY "Only service role can insert fedwatch cache"
ON public.fedwatch_cache FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only service role can update fedwatch cache"
ON public.fedwatch_cache FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Only service role can delete fedwatch cache"
ON public.fedwatch_cache FOR DELETE
TO service_role
USING (true);
