-- Allow public select & manage for cities
DROP POLICY IF EXISTS "Anyone can view cities" ON public.cities;
DROP POLICY IF EXISTS "Authenticated users can manage cities" ON public.cities;
DROP POLICY IF EXISTS "Allow public cities" ON public.cities;

CREATE POLICY "Anyone can view cities" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Allow public cities" ON public.cities FOR ALL USING (true) WITH CHECK (true);
