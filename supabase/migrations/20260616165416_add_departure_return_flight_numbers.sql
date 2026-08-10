-- Add departure_flight_number and return_flight_number columns to flights table
ALTER TABLE public.flights 
  ADD COLUMN IF NOT EXISTS departure_flight_number text,
  ADD COLUMN IF NOT EXISTS return_flight_number text;
