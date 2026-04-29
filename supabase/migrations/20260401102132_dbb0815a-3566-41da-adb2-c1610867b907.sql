
-- PNR Bookings table
CREATE TABLE public.pnr_bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pnr text NOT NULL,
  route text NOT NULL,
  flight_date date NOT NULL,
  airline text NOT NULL,
  ticket_type text NOT NULL DEFAULT 'one_way',
  hotel text,
  status text NOT NULL DEFAULT 'active',
  is_modified boolean NOT NULL DEFAULT false,
  notes text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- PNR Passengers table
CREATE TABLE public.pnr_passengers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pnr_booking_id uuid NOT NULL REFERENCES public.pnr_bookings(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'MR',
  first_name text NOT NULL,
  last_name text NOT NULL,
  ticket_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- PNR Booking Changes (audit trail)
CREATE TABLE public.pnr_booking_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pnr_booking_id uuid NOT NULL REFERENCES public.pnr_bookings(id) ON DELETE CASCADE,
  change_type text NOT NULL,
  field_name text,
  before_value text,
  after_value text,
  description text,
  user_id uuid,
  user_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pnr_bookings_pnr ON public.pnr_bookings(pnr);
CREATE INDEX idx_pnr_bookings_user_id ON public.pnr_bookings(user_id);
CREATE INDEX idx_pnr_bookings_flight_date ON public.pnr_bookings(flight_date);
CREATE INDEX idx_pnr_passengers_booking_id ON public.pnr_passengers(pnr_booking_id);
CREATE INDEX idx_pnr_booking_changes_booking_id ON public.pnr_booking_changes(pnr_booking_id);

-- Enable RLS
ALTER TABLE public.pnr_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnr_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnr_booking_changes ENABLE ROW LEVEL SECURITY;

-- RLS for pnr_bookings
CREATE POLICY "Admins can manage all pnr bookings" ON public.pnr_bookings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own pnr bookings" ON public.pnr_bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create pnr bookings" ON public.pnr_bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- RLS for pnr_passengers
CREATE POLICY "Admins can manage all pnr passengers" ON public.pnr_passengers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own pnr passengers" ON public.pnr_passengers FOR SELECT TO authenticated USING (pnr_booking_id IN (SELECT id FROM public.pnr_bookings WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own pnr passengers" ON public.pnr_passengers FOR INSERT TO authenticated WITH CHECK (pnr_booking_id IN (SELECT id FROM public.pnr_bookings WHERE user_id = auth.uid()));

-- RLS for pnr_booking_changes
CREATE POLICY "Admins can view all pnr changes" ON public.pnr_booking_changes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own pnr changes" ON public.pnr_booking_changes FOR SELECT TO authenticated USING (pnr_booking_id IN (SELECT id FROM public.pnr_bookings WHERE user_id = auth.uid()));
CREATE POLICY "Authenticated can insert pnr changes" ON public.pnr_booking_changes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Updated_at triggers
CREATE TRIGGER update_pnr_bookings_updated_at BEFORE UPDATE ON public.pnr_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pnr_passengers_updated_at BEFORE UPDATE ON public.pnr_passengers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
