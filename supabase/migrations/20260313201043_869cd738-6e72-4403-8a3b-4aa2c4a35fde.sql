
-- Drop existing policies first, then recreate
DROP POLICY IF EXISTS "Authenticated users can view course files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload course files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update course files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete course files" ON storage.objects;

CREATE POLICY "Authenticated users can view course files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'course-files');

CREATE POLICY "Admins can upload course files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update course files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete course files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-files' AND public.has_role(auth.uid(), 'admin'));
