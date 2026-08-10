-- Fix RLS: allow all authenticated users to manage key tables
-- Previously restricted to admin-only, causing "violates row-level security" errors for regular admins

-- ============================================
-- 1. flight_default_fares
-- ============================================
DROP POLICY IF EXISTS "Admins can manage flight_default_fares" ON public.flight_default_fares;
DROP POLICY IF EXISTS "Authenticated users can manage flight_default_fares" ON public.flight_default_fares;
DROP POLICY IF EXISTS "Anyone can view flight_default_fares" ON public.flight_default_fares;

CREATE POLICY "Authenticated users can manage flight_default_fares"
  ON public.flight_default_fares FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. flight_special_fares
-- ============================================
DROP POLICY IF EXISTS "Admins can manage flight_special_fares" ON public.flight_special_fares;
DROP POLICY IF EXISTS "Authenticated users can manage flight_special_fares" ON public.flight_special_fares;
DROP POLICY IF EXISTS "Anyone can view flight_special_fares" ON public.flight_special_fares;

CREATE POLICY "Authenticated users can manage flight_special_fares"
  ON public.flight_special_fares FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. hotel_rooms
-- ============================================
DROP POLICY IF EXISTS "Admins can manage rooms" ON public.hotel_rooms;
DROP POLICY IF EXISTS "Anyone can view active rooms" ON public.hotel_rooms;
DROP POLICY IF EXISTS "Authenticated users can manage hotel_rooms" ON public.hotel_rooms;

CREATE POLICY "Authenticated users can manage hotel_rooms"
  ON public.hotel_rooms FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. hotel_available_dates
-- ============================================
DROP POLICY IF EXISTS "Admins can manage hotel available dates" ON public.hotel_available_dates;
DROP POLICY IF EXISTS "Anyone can view hotel available dates" ON public.hotel_available_dates;
DROP POLICY IF EXISTS "Authenticated users can manage hotel_available_dates" ON public.hotel_available_dates;

CREATE POLICY "Authenticated users can manage hotel_available_dates"
  ON public.hotel_available_dates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 5. flights
-- ============================================
DROP POLICY IF EXISTS "Admins can manage flights" ON public.flights;
DROP POLICY IF EXISTS "Anyone can view active flights" ON public.flights;
DROP POLICY IF EXISTS "Authenticated users can manage flights" ON public.flights;
DROP POLICY IF EXISTS "Anyone can view flights" ON public.flights;

CREATE POLICY "Authenticated users can manage flights"
  ON public.flights FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view flights"
  ON public.flights FOR SELECT
  USING (true);

-- ============================================
-- 6. hotels
-- ============================================
DROP POLICY IF EXISTS "Admins can manage hotels" ON public.hotels;
DROP POLICY IF EXISTS "Anyone can view active hotels" ON public.hotels;
DROP POLICY IF EXISTS "Authenticated users can manage hotels" ON public.hotels;
DROP POLICY IF EXISTS "Anyone can view hotels" ON public.hotels;

CREATE POLICY "Authenticated users can manage hotels"
  ON public.hotels FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view hotels"
  ON public.hotels FOR SELECT
  USING (true);

-- ============================================
-- 7. tours
-- ============================================
DROP POLICY IF EXISTS "Admins can manage tours" ON public.tours;
DROP POLICY IF EXISTS "Anyone can view active tours" ON public.tours;
DROP POLICY IF EXISTS "Authenticated users can manage tours" ON public.tours;
DROP POLICY IF EXISTS "Anyone can view tours" ON public.tours;

CREATE POLICY "Authenticated users can manage tours"
  ON public.tours FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view tours"
  ON public.tours FOR SELECT
  USING (true);
