-- Add contact person fields to agencies table
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS contact_person_name text;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS contact_phone text;

-- Add round-trip support fields to flights table
ALTER TABLE public.flights ADD COLUMN IF NOT EXISTS trip_type text DEFAULT 'one_way';
ALTER TABLE public.flights ADD COLUMN IF NOT EXISTS linked_flight_id uuid REFERENCES public.flights(id);