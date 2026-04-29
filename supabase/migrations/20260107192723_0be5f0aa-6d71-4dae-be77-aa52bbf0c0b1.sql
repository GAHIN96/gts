-- Create storage bucket for package images
INSERT INTO storage.buckets (id, name, public) VALUES ('package-images', 'package-images', true);

-- Create policy for public viewing of package images
CREATE POLICY "Anyone can view package images"
ON storage.objects FOR SELECT
USING (bucket_id = 'package-images');

-- Create policy for admin upload of package images
CREATE POLICY "Admins can upload package images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'package-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Create policy for admin update of package images
CREATE POLICY "Admins can update package images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'package-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Create policy for admin delete of package images
CREATE POLICY "Admins can delete package images"
ON storage.objects FOR DELETE
USING (bucket_id = 'package-images' AND has_role(auth.uid(), 'admin'::app_role));