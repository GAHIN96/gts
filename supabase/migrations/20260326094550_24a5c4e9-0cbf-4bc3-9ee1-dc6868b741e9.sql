
ALTER TABLE public.visas
  ADD COLUMN IF NOT EXISTS ops_email text,
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS flag_image_url text,
  ADD COLUMN IF NOT EXISTS issue_duration text,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS terms_policy text,
  ADD COLUMN IF NOT EXISTS passport_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_scan_required boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.visa_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_id uuid NOT NULL REFERENCES public.visas(id) ON DELETE CASCADE,
  min_age integer NOT NULL DEFAULT 0,
  max_age integer NOT NULL DEFAULT 100,
  price numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.visa_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage visa prices" ON public.visa_prices
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view visa prices" ON public.visa_prices
  FOR SELECT USING (true);
