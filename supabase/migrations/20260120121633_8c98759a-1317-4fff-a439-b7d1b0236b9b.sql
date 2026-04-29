-- Add image_url column to transfers table for transfer images
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for transfer images
INSERT INTO storage.buckets (id, name, public)
VALUES ('transfer-images', 'transfer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to transfer images
CREATE POLICY "Public can view transfer images"
ON storage.objects FOR SELECT
USING (bucket_id = 'transfer-images');

-- Allow authenticated users to upload transfer images
CREATE POLICY "Authenticated users can upload transfer images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'transfer-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their transfer images
CREATE POLICY "Authenticated users can update transfer images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'transfer-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete transfer images
CREATE POLICY "Authenticated users can delete transfer images"
ON storage.objects FOR DELETE
USING (bucket_id = 'transfer-images' AND auth.role() = 'authenticated');