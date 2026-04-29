
-- Countries table
CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code varchar(3) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage countries" ON public.countries FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view active countries" ON public.countries FOR SELECT USING (is_active = true);

-- Airlines table
CREATE TABLE public.airlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code varchar(3) NOT NULL,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage airlines" ON public.airlines FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view active airlines" ON public.airlines FOR SELECT USING (is_active = true);

-- Airports table
CREATE TABLE public.airports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code varchar(4) NOT NULL,
  city_id uuid REFERENCES public.cities(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage airports" ON public.airports FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view active airports" ON public.airports FOR SELECT USING (is_active = true);

-- Amenities table
CREATE TABLE public.amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  icon text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage amenities" ON public.amenities FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view active amenities" ON public.amenities FOR SELECT USING (is_active = true);
