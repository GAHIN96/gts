-- Make guest_type, person_type, room_type, price, rate columns flexible/nullable in package_rates table
ALTER TABLE public.package_rates ALTER COLUMN guest_type DROP NOT NULL;
ALTER TABLE public.package_rates ALTER COLUMN room_type DROP NOT NULL;
ALTER TABLE public.package_rates ALTER COLUMN price DROP NOT NULL;
ALTER TABLE public.package_rates ALTER COLUMN commission DROP NOT NULL;

-- Set default guest_type if null
ALTER TABLE public.package_rates ALTER COLUMN guest_type SET DEFAULT 'adult';
