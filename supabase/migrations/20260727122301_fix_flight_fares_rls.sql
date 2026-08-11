-- Fix flight fares RLS to allow all authenticated users (or anyone with a role) to manage them
DROP POLICY IF EXISTS "Admins can manage flight_default_fares" ON public.flight_default_fares;
DROP POLICY IF EXISTS "Authenticated users can manage flight_default_fares" ON public.flight_default_fares;

DROP POLICY IF EXISTS "Admins can manage flight_special_fares" ON public.flight_special_fares;
DROP POLICY IF EXISTS "Authenticated users can manage flight_special_fares" ON public.flight_special_fares;

CREATE POLICY "Authenticated users can manage flight_default_fares"
  ON public.flight_default_fares FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage flight_special_fares"
  ON public.flight_special_fares FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
