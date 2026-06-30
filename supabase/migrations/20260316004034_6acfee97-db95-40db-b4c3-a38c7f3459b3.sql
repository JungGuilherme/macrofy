
-- Create storage bucket for document uploads (reports and articles)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read files
CREATE POLICY "Anyone authenticated can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow admins to upload files
CREATE POLICY "Admins can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow admins to delete files
CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'::public.app_role));
