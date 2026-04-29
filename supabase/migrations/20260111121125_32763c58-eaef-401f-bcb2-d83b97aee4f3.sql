-- Create app_settings table for general settings (voucher, company, etc.)
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create banner_images table for hero slideshows
CREATE TABLE public.banner_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  image_url text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster module lookups
CREATE INDEX idx_banner_images_module ON public.banner_images(module);

-- Enable RLS on both tables
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_settings
CREATE POLICY "Anyone can view settings"
ON public.app_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.app_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for banner_images
CREATE POLICY "Anyone can view banner images"
ON public.banner_images
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage banner images"
ON public.banner_images
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on app_settings
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on banner_images
CREATE TRIGGER update_banner_images_updated_at
BEFORE UPDATE ON public.banner_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create settings-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('settings-images', 'settings-images', true);

-- Storage policies for settings-images bucket
CREATE POLICY "Anyone can view settings images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'settings-images');

CREATE POLICY "Admins can upload settings images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'settings-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'settings-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete settings images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'settings-images' AND has_role(auth.uid(), 'admin'::app_role));