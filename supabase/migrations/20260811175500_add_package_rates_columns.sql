-- Add missing columns to package_rates table
ALTER TABLE public.package_rates 
  ADD COLUMN IF NOT EXISTS person_type TEXT DEFAULT 'adult',
  ADD COLUMN IF NOT EXISTS buying_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS single_supplement NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_bed_price NUMERIC DEFAULT 0;

-- Ensure RLS policy permits all actions on package_rates
ALTER TABLE public.package_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "package_rates_allow_all" ON public.package_rates;
CREATE POLICY "package_rates_allow_all" ON public.package_rates FOR ALL USING (true) WITH CHECK (true);
