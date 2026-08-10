-- Add transit_airport and transit_duration columns to flights table
ALTER TABLE public.flights 
  ADD COLUMN IF NOT EXISTS transit_airport text,
  ADD COLUMN IF NOT EXISTS transit_duration text;
