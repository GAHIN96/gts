-- Replace date range with room-quantity tier on hotel default prices
ALTER TABLE public.hotel_rooms
  ADD COLUMN IF NOT EXISTS room_from integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS room_to integer NOT NULL DEFAULT 20;

-- Backfill any existing rows so the tier covers all available rooms
UPDATE public.hotel_rooms
SET room_from = 1,
    room_to = GREATEST(COALESCE(total_rooms, available_rooms, 20), 1)
WHERE room_from IS NULL OR room_to IS NULL OR room_to < room_from;