-- Add visa_required column to group_packages table
ALTER TABLE public.group_packages ADD COLUMN IF NOT EXISTS visa_required boolean DEFAULT true;