
ALTER TABLE public.hotel_rooms
  ADD COLUMN price_adult numeric DEFAULT 0,
  ADD COLUMN price_child numeric DEFAULT 0,
  ADD COLUMN price_child_6 numeric DEFAULT 0,
  ADD COLUMN price_infant numeric DEFAULT 0;
