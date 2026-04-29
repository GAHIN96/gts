-- Create junction table for package departure flights
CREATE TABLE public.package_departure_flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID NOT NULL REFERENCES public.package_departures(id) ON DELETE CASCADE,
  flight_id UUID NOT NULL REFERENCES public.flights(id) ON DELETE CASCADE,
  flight_type TEXT NOT NULL DEFAULT 'outbound',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_flight_type CHECK (flight_type IN ('outbound', 'return'))
);

-- Enable RLS
ALTER TABLE public.package_departure_flights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage departure flights"
ON public.package_departure_flights
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view departure flights"
ON public.package_departure_flights
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_package_departure_flights_departure ON public.package_departure_flights(departure_id);
CREATE INDEX idx_package_departure_flights_flight ON public.package_departure_flights(flight_id);