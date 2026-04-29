-- Add day_program column to tours table for day-by-day itinerary
ALTER TABLE public.tours 
ADD COLUMN IF NOT EXISTS day_program jsonb DEFAULT '[]'::jsonb;

-- Add airline_logo column to flights table
ALTER TABLE public.flights 
ADD COLUMN IF NOT EXISTS airline_logo text;

-- Create storage bucket for airline logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('airline-logos', 'airline-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for airline logos bucket
CREATE POLICY "Anyone can view airline logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'airline-logos');

CREATE POLICY "Admins can upload airline logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'airline-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update airline logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'airline-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete airline logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'airline-logos' AND has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for tour images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('tour-images', 'tour-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for tour images bucket
CREATE POLICY "Anyone can view tour images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tour-images');

CREATE POLICY "Admins can upload tour images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tour-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tour images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tour-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tour images"
ON storage.objects FOR DELETE
USING (bucket_id = 'tour-images' AND has_role(auth.uid(), 'admin'::app_role));