
CREATE TABLE public.flight_seat_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id UUID NOT NULL REFERENCES public.flights(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  blocked_seats INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.flight_seat_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage seat blocks"
  ON public.flight_seat_blocks
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agencies can view own seat blocks"
  ON public.flight_seat_blocks
  FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active seat blocks"
  ON public.flight_seat_blocks
  FOR SELECT
  USING (is_active = true);
