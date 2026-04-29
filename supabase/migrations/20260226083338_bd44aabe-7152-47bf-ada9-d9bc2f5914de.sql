
ALTER TABLE public.group_packages
  ADD COLUMN IF NOT EXISTS source_airport text,
  ADD COLUMN IF NOT EXISTS destination_airport text,
  ADD COLUMN IF NOT EXISTS airline text,
  ADD COLUMN IF NOT EXISTS group_ops_email text,
  ADD COLUMN IF NOT EXISTS visa_ops_email text,
  ADD COLUMN IF NOT EXISTS visa_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS photo_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_backside_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS guide_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS gate_number text,
  ADD COLUMN IF NOT EXISTS cover_photo_url text,
  ADD COLUMN IF NOT EXISTS group_policy text;
