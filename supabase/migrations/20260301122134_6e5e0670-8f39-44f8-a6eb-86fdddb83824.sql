-- Create hotel-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('hotel-images', 'hotel-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads to hotel-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'hotel-images');

-- Allow public read access
CREATE POLICY "Allow public read of hotel-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'hotel-images');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated delete of hotel-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'hotel-images');