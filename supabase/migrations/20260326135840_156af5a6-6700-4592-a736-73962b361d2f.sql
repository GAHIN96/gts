
CREATE TABLE public.flight_default_fares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id UUID NOT NULL REFERENCES public.flights(id) ON DELETE CASCADE,
  person_type TEXT NOT NULL DEFAULT 'ADULT',
  seat_from INTEGER NOT NULL DEFAULT 1,
  seat_to INTEGER NOT NULL DEFAULT 20,
  rate NUMERIC NOT NULL DEFAULT 0,
  commission NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.flight_special_fares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id UUID NOT NULL REFERENCES public.flights(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  person_type TEXT NOT NULL DEFAULT 'ADULT',
  seat_from INTEGER NOT NULL DEFAULT 1,
  seat_to INTEGER NOT NULL DEFAULT 20,
  rate NUMERIC NOT NULL DEFAULT 0,
  commission NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.flight_default_fares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_special_fares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage flight_default_fares" ON public.flight_default_fares FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage flight_special_fares" ON public.flight_special_fares FOR ALL TO authenticated USING (true) WITH CHECK (true);
