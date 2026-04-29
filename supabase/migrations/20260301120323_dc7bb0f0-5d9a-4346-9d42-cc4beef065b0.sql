ALTER TABLE public.package_departures 
  ADD COLUMN IF NOT EXISTS departure_time text,
  ADD COLUMN IF NOT EXISTS dept_arr_time text,
  ADD COLUMN IF NOT EXISTS return_time text,
  ADD COLUMN IF NOT EXISTS ret_arr_time text;