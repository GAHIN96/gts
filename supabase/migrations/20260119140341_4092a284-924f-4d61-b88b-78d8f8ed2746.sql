-- Add route and pricing columns to transfers table
ALTER TABLE public.transfers 
ADD COLUMN route_from text,
ADD COLUMN route_to text,
ADD COLUMN price_per_passengers integer DEFAULT 1;

-- Add comment for clarity
COMMENT ON COLUMN public.transfers.price_per_passengers IS 'Number of passengers included in the base price. 1 = per person, higher = fixed price for N passengers';