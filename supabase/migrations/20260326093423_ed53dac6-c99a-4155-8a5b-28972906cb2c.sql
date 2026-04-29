
ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS passport_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_scan_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_backside_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS visa_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flight_policy text,
  ADD COLUMN IF NOT EXISTS cover_photo_url text,
  ADD COLUMN IF NOT EXISTS ops_email text,
  ADD COLUMN IF NOT EXISTS order_number text;
