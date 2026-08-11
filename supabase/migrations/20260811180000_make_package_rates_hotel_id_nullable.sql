-- Make hotel_id column nullable in package_rates table so package rates save without error
ALTER TABLE public.package_rates ALTER COLUMN hotel_id DROP NOT NULL;
