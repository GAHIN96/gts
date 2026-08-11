-- Enable RLS and grant full permissive access for agencies table
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agencies_allow_all" ON public.agencies;
DROP POLICY IF EXISTS "Admins can manage agencies" ON public.agencies;
DROP POLICY IF EXISTS "Authenticated users can manage agencies" ON public.agencies;
CREATE POLICY "agencies_allow_all" ON public.agencies FOR ALL USING (true) WITH CHECK (true);
