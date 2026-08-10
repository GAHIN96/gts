-- Add duration, baggage, and alert_level columns to flights table
ALTER TABLE public.flights 
  ADD COLUMN IF NOT EXISTS duration text,
  ADD COLUMN IF NOT EXISTS baggage text,
  ADD COLUMN IF NOT EXISTS alert_level integer DEFAULT 0;
