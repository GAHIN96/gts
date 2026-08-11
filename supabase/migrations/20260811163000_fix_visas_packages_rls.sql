-- Fix RLS policies for visas and group_packages to allow public viewing and management
DROP POLICY IF EXISTS "Anyone can view visas" ON public.visas;
DROP POLICY IF EXISTS "Authenticated users can manage visas" ON public.visas;
DROP POLICY IF EXISTS "Allow public visas" ON public.visas;

CREATE POLICY "Anyone can view visas" ON public.visas FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage visas" ON public.visas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view group_packages" ON public.group_packages;
DROP POLICY IF EXISTS "Authenticated users can manage group_packages" ON public.group_packages;
DROP POLICY IF EXISTS "Allow public group_packages" ON public.group_packages;

CREATE POLICY "Anyone can view group_packages" ON public.group_packages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage group_packages" ON public.group_packages FOR ALL USING (true) WITH CHECK (true);
