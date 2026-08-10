ALTER TABLE public.hotel_special_prices
  ADD COLUMN IF NOT EXISTS room_from integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS room_to integer NOT NULL DEFAULT 20;

-- Backfill any existing rows so the tier matches the room it is linked to
UPDATE public.hotel_special_prices hsp
SET room_from = hr.room_from,
    room_to = hr.room_to
FROM public.hotel_rooms hr
WHERE hsp.room_id = hr.id;
