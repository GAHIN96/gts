ALTER TABLE public.group_packages 
  ADD COLUMN visa_amount_adt numeric DEFAULT 0,
  ADD COLUMN visa_amount_chd numeric DEFAULT 0,
  ADD COLUMN visa_amount_inf numeric DEFAULT 0;