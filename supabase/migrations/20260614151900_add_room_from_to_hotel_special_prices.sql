-- Add room_from and room_to columns to hotel_special_prices table
ALTER TABLE public.hotel_special_prices
  ADD COLUMN IF NOT EXISTS room_from integer,
  ADD COLUMN IF NOT EXISTS room_to integer;

-- Backfill existing rows from the linked hotel_rooms data
UPDATE public.hotel_special_prices hsp
SET room_from = hr.room_from,
    room_to = hr.room_to
FROM public.hotel_rooms hr
WHERE hsp.room_id = hr.id;
