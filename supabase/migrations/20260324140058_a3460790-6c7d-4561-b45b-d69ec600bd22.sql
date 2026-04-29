
-- Create flight price tiers table for quantity-based pricing
CREATE TABLE public.flight_price_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flight_id UUID NOT NULL REFERENCES public.flights(id) ON DELETE CASCADE,
  min_passengers INTEGER NOT NULL DEFAULT 1,
  max_passengers INTEGER NOT NULL DEFAULT 999,
  price_per_seat NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flight_price_tiers ENABLE ROW LEVEL SECURITY;

-- Admins can manage tiers
CREATE POLICY "Admins can manage flight price tiers"
  ON public.flight_price_tiers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view tiers (needed for booking flow)
CREATE POLICY "Anyone can view flight price tiers"
  ON public.flight_price_tiers FOR SELECT
  USING (true);
