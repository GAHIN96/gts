
CREATE TABLE public.package_hotel_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.group_packages(id) ON DELETE CASCADE,
  departure_id uuid NOT NULL REFERENCES public.package_departures(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  available_rooms integer NOT NULL DEFAULT 0,
  booked_rooms integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(departure_id, hotel_id)
);

ALTER TABLE public.package_hotel_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage hotel availability"
  ON public.package_hotel_availability FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view hotel availability"
  ON public.package_hotel_availability FOR SELECT
  USING (true);
