
-- Add program_pdf_url column to group_packages
ALTER TABLE public.group_packages ADD COLUMN program_pdf_url TEXT;

-- Create package-programs storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('package-programs', 'package-programs', true);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload program PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'package-programs' AND auth.uid() IS NOT NULL);

-- Allow public read
CREATE POLICY "Anyone can view program PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'package-programs');

-- Allow authenticated users to update/replace
CREATE POLICY "Authenticated users can update program PDFs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'package-programs' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete program PDFs"
ON storage.objects FOR DELETE
USING (bucket_id = 'package-programs' AND auth.uid() IS NOT NULL);
