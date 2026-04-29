-- Add airport codes to flights table
ALTER TABLE public.flights 
ADD COLUMN departure_airport_code VARCHAR(10),
ADD COLUMN arrival_airport_code VARCHAR(10);

-- Add comment for clarity
COMMENT ON COLUMN public.flights.departure_airport_code IS 'Airport code like EBL, DXB, IST';
COMMENT ON COLUMN public.flights.arrival_airport_code IS 'Airport code like EBL, DXB, IST';