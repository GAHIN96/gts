-- Drop existing overly permissive policies on passenger-documents bucket
DROP POLICY IF EXISTS "Users can view passenger documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload passenger documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all passenger documents" ON storage.objects;

-- Users can only SELECT their own documents (folder = their user_id)
CREATE POLICY "Users can view own passenger documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'passenger-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only INSERT to their own folder
CREATE POLICY "Users can upload own passenger documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'passenger-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can UPDATE their own documents
CREATE POLICY "Users can update own passenger documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'passenger-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can DELETE their own documents
CREATE POLICY "Users can delete own passenger documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'passenger-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can manage all passenger documents
CREATE POLICY "Admins can manage all passenger documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'passenger-documents'
  AND public.has_role(auth.uid(), 'admin')
);