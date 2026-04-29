ALTER TABLE public.group_packages ADD COLUMN IF NOT EXISTS barcode_image_url text DEFAULT NULL;
ALTER TABLE public.group_packages ADD COLUMN IF NOT EXISTS barcode_link_url text DEFAULT NULL;