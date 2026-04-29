-- Create cities table
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_packages table
CREATE TABLE public.group_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  nights INTEGER NOT NULL DEFAULT 1,
  starting_price DECIMAL(10,2) NOT NULL,
  includes_flight BOOLEAN DEFAULT false,
  includes_hotel BOOLEAN DEFAULT false,
  includes_transfer BOOLEAN DEFAULT false,
  includes_tours BOOLEAN DEFAULT false,
  images TEXT[] DEFAULT '{}',
  day_program JSONB DEFAULT '[]',
  included_items TEXT[] DEFAULT '{}',
  not_included_items TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create package_departures table (available dates for packages)
CREATE TABLE public.package_departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES public.group_packages(id) ON DELETE CASCADE NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  total_seats INTEGER NOT NULL DEFAULT 20,
  available_seats INTEGER NOT NULL DEFAULT 20,
  price_per_person DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hotels table
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  star_rating INTEGER DEFAULT 3 CHECK (star_rating >= 1 AND star_rating <= 5),
  address TEXT,
  description TEXT,
  amenities TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  price_per_night DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hotel_rooms table
CREATE TABLE public.hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  room_type TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  price_per_night DECIMAL(10,2) NOT NULL,
  description TEXT,
  amenities TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create flights table
CREATE TABLE public.flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airline TEXT NOT NULL,
  flight_number TEXT,
  departure_city TEXT NOT NULL,
  arrival_city TEXT NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TIME,
  arrival_date DATE NOT NULL,
  arrival_time TIME,
  price DECIMAL(10,2) NOT NULL,
  available_seats INTEGER DEFAULT 100,
  class TEXT DEFAULT 'economy',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tours table
CREATE TABLE public.tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_hours INTEGER DEFAULT 4,
  price DECIMAL(10,2) NOT NULL,
  includes TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  max_participants INTEGER DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create visas table
CREATE TABLE public.visas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  visa_type TEXT NOT NULL,
  processing_days INTEGER NOT NULL DEFAULT 7,
  price DECIMAL(10,2) NOT NULL,
  requirements TEXT[] DEFAULT '{}',
  documents_required TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking status enum
CREATE TYPE public.booking_status AS ENUM (
  'draft',
  'pending_payment',
  'payment_under_review',
  'confirmed',
  'canceled',
  'refunded'
);

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM (
  'unpaid',
  'proof_uploaded',
  'approved',
  'rejected',
  'refunded'
);

-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM (
  'qicard',
  'first_iraqi_bank',
  'bank_transfer',
  'pay_in_office'
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  departure_id UUID REFERENCES public.package_departures(id) ON DELETE SET NULL,
  flight_id UUID REFERENCES public.flights(id) ON DELETE SET NULL,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
  tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL,
  visa_id UUID REFERENCES public.visas(id) ON DELETE SET NULL,
  booking_type TEXT NOT NULL,
  status booking_status DEFAULT 'draft',
  total_amount DECIMAL(10,2) NOT NULL,
  passengers INTEGER DEFAULT 1,
  passenger_details JSONB DEFAULT '[]',
  special_requests TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'unpaid',
  proof_url TEXT,
  transaction_reference TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agencies table (extends profiles for agency-specific data)
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  agency_name TEXT NOT NULL,
  license_number TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_departures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cities (public read, admin write)
CREATE POLICY "Anyone can view active cities" ON public.cities FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage cities" ON public.cities FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for group_packages (public read, admin write)
CREATE POLICY "Anyone can view active packages" ON public.group_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage packages" ON public.group_packages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for package_departures (public read, admin write)
CREATE POLICY "Anyone can view active departures" ON public.package_departures FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage departures" ON public.package_departures FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for hotels (public read, admin write)
CREATE POLICY "Anyone can view active hotels" ON public.hotels FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage hotels" ON public.hotels FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for hotel_rooms (public read, admin write)
CREATE POLICY "Anyone can view active rooms" ON public.hotel_rooms FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage rooms" ON public.hotel_rooms FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for flights (public read, admin write)
CREATE POLICY "Anyone can view active flights" ON public.flights FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage flights" ON public.flights FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tours (public read, admin write)
CREATE POLICY "Anyone can view active tours" ON public.tours FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage tours" ON public.tours FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for visas (public read, admin write)
CREATE POLICY "Anyone can view active visas" ON public.visas FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage visas" ON public.visas FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for bookings (users see own, admin/finance see all)
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own draft bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id AND status = 'draft');
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Finance can view all bookings" ON public.bookings FOR SELECT USING (public.has_role(auth.uid(), 'finance'));

-- RLS Policies for payments (users see own, admin/finance manage)
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending payments" ON public.payments FOR UPDATE USING (auth.uid() = user_id AND status = 'unpaid');
CREATE POLICY "Admins can manage all payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Finance can manage all payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(), 'finance'));

-- RLS Policies for agencies (users see own, admin see all)
CREATE POLICY "Users can view own agency" ON public.agencies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own agency" ON public.agencies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agency" ON public.agencies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all agencies" ON public.agencies FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for audit_logs (admin only)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Function to generate booking number
CREATE OR REPLACE FUNCTION public.generate_booking_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.booking_number := 'GTS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_booking_number
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.generate_booking_number();

-- Add updated_at triggers to all tables
CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON public.cities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_group_packages_updated_at BEFORE UPDATE ON public.group_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_package_departures_updated_at BEFORE UPDATE ON public.package_departures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hotel_rooms_updated_at BEFORE UPDATE ON public.hotel_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_flights_updated_at BEFORE UPDATE ON public.flights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tours_updated_at BEFORE UPDATE ON public.tours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_visas_updated_at BEFORE UPDATE ON public.visas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON public.agencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();