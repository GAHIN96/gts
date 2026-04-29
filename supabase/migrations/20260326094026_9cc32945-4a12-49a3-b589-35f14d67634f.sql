
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS ops_email text,
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS num_rooms integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS add_child boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS add_infant boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hotel_policy text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS remarks text;

-- Hotel special prices table
CREATE TABLE IF NOT EXISTS public.hotel_special_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  from_date date NOT NULL,
  to_date date NOT NULL,
  room_rate numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hotel_special_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage hotel special prices" ON public.hotel_special_prices
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view hotel special prices" ON public.hotel_special_prices
  FOR SELECT USING (true);

-- Hotel available dates table
CREATE TABLE IF NOT EXISTS public.hotel_available_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  from_date date NOT NULL,
  to_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hotel_available_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage hotel available dates" ON public.hotel_available_dates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view hotel available dates" ON public.hotel_available_dates
  FOR SELECT USING (true);
