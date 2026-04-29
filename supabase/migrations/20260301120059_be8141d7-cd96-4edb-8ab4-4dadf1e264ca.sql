ALTER TABLE public.package_departures 
  ADD COLUMN IF NOT EXISTS alert_level integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fl_number text,
  ADD COLUMN IF NOT EXISTS ret_fl_number text,
  ADD COLUMN IF NOT EXISTS baggage text;