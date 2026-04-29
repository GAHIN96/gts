
-- Create package_rates table for default pricing
CREATE TABLE public.package_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.group_packages(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  guest_type TEXT NOT NULL,
  room_type TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  count INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL DEFAULT 0,
  commission NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.package_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage package rates" ON public.package_rates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view package rates" ON public.package_rates FOR SELECT USING (true);

-- Create package_special_rates table for date-specific pricing
CREATE TABLE public.package_special_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.group_packages(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  guest_type TEXT NOT NULL,
  room_type TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  commission NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.package_special_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage package special rates" ON public.package_special_rates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view package special rates" ON public.package_special_rates FOR SELECT USING (true);
