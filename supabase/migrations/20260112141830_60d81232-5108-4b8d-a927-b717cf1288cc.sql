-- Create storage bucket for passenger documents (passport photos, IDs, etc.)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('passenger-documents', 'passenger-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Users can upload their own passenger documents
CREATE POLICY "Users can upload passenger documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'passenger-documents');

-- RLS policy: Users can view their own passenger documents
CREATE POLICY "Users can view passenger documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'passenger-documents');

-- RLS policy: Admins can manage all passenger documents
CREATE POLICY "Admins can manage all passenger documents"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'passenger-documents' AND EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));