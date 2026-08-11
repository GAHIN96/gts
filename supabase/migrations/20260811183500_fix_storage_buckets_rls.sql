-- Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('settings-images', 'settings-images', true),
  ('public-assets', 'public-assets', true),
  ('vouchers', 'vouchers', true),
  ('agency-logos', 'agency-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable RLS and grant permissive policies on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public uploads on storage.objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow public select on storage.objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update on storage.objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete on storage.objects" ON storage.objects;

CREATE POLICY "Allow public uploads on storage.objects" ON storage.objects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select on storage.objects" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Allow public update on storage.objects" ON storage.objects FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on storage.objects" ON storage.objects FOR DELETE USING (true);
