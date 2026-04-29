ALTER TABLE public.hotel_special_prices
  ADD COLUMN IF NOT EXISTS price_adult numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_child_6_12 numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_child_2_6 numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_infant numeric NOT NULL DEFAULT 0;