-- Enable RLS and grant full permissive access for package_hotels
ALTER TABLE public.package_hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "package_hotels_allow_all" ON public.package_hotels;
CREATE POLICY "package_hotels_allow_all" ON public.package_hotels FOR ALL USING (true) WITH CHECK (true);
