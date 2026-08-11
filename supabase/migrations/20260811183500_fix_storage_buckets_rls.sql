-- Create public storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('settings-images', 'settings-images', true),
  ('public-assets', 'public-assets', true),
  ('vouchers', 'vouchers', true),
  ('agency-logos', 'agency-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;
