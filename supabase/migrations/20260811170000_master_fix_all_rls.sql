-- MASTER RLS FIX: Allow full access for all operations across all application tables

-- 1. flight_default_fares
ALTER TABLE public.flight_default_fares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flight_default_fares_allow_all" ON public.flight_default_fares;
DROP POLICY IF EXISTS "Admins can manage flight_default_fares" ON public.flight_default_fares;
DROP POLICY IF EXISTS "Authenticated users can manage flight_default_fares" ON public.flight_default_fares;
DROP POLICY IF EXISTS "Anyone can view flight_default_fares" ON public.flight_default_fares;
CREATE POLICY "flight_default_fares_allow_all" ON public.flight_default_fares FOR ALL USING (true) WITH CHECK (true);

-- 2. flight_special_fares
ALTER TABLE public.flight_special_fares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flight_special_fares_allow_all" ON public.flight_special_fares;
DROP POLICY IF EXISTS "Admins can manage flight_special_fares" ON public.flight_special_fares;
DROP POLICY IF EXISTS "Authenticated users can manage flight_special_fares" ON public.flight_special_fares;
DROP POLICY IF EXISTS "Anyone can view flight_special_fares" ON public.flight_special_fares;
CREATE POLICY "flight_special_fares_allow_all" ON public.flight_special_fares FOR ALL USING (true) WITH CHECK (true);

-- 3. flights
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flights_allow_all" ON public.flights;
DROP POLICY IF EXISTS "Admins can manage flights" ON public.flights;
DROP POLICY IF EXISTS "Authenticated users can manage flights" ON public.flights;
DROP POLICY IF EXISTS "Anyone can view flights" ON public.flights;
CREATE POLICY "flights_allow_all" ON public.flights FOR ALL USING (true) WITH CHECK (true);

-- 4. flight_seats
ALTER TABLE public.flight_seats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flight_seats_allow_all" ON public.flight_seats;
CREATE POLICY "flight_seats_allow_all" ON public.flight_seats FOR ALL USING (true) WITH CHECK (true);

-- 5. hotels
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotels_allow_all" ON public.hotels;
DROP POLICY IF EXISTS "Admins can manage hotels" ON public.hotels;
DROP POLICY IF EXISTS "Authenticated users can manage hotels" ON public.hotels;
DROP POLICY IF EXISTS "Anyone can view hotels" ON public.hotels;
CREATE POLICY "hotels_allow_all" ON public.hotels FOR ALL USING (true) WITH CHECK (true);

-- 6. hotel_rooms
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotel_rooms_allow_all" ON public.hotel_rooms;
DROP POLICY IF EXISTS "Admins can manage rooms" ON public.hotel_rooms;
DROP POLICY IF EXISTS "Authenticated users can manage hotel_rooms" ON public.hotel_rooms;
DROP POLICY IF EXISTS "Anyone can view active rooms" ON public.hotel_rooms;
CREATE POLICY "hotel_rooms_allow_all" ON public.hotel_rooms FOR ALL USING (true) WITH CHECK (true);

-- 7. hotel_available_dates
ALTER TABLE public.hotel_available_dates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotel_available_dates_allow_all" ON public.hotel_available_dates;
DROP POLICY IF EXISTS "Admins can manage hotel available dates" ON public.hotel_available_dates;
DROP POLICY IF EXISTS "Authenticated users can manage hotel_available_dates" ON public.hotel_available_dates;
DROP POLICY IF EXISTS "Anyone can view hotel available dates" ON public.hotel_available_dates;
CREATE POLICY "hotel_available_dates_allow_all" ON public.hotel_available_dates FOR ALL USING (true) WITH CHECK (true);

-- 8. hotel_special_prices
ALTER TABLE public.hotel_special_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotel_special_prices_allow_all" ON public.hotel_special_prices;
CREATE POLICY "hotel_special_prices_allow_all" ON public.hotel_special_prices FOR ALL USING (true) WITH CHECK (true);

-- 9. group_packages
ALTER TABLE public.group_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_packages_allow_all" ON public.group_packages;
DROP POLICY IF EXISTS "Anyone can view group_packages" ON public.group_packages;
DROP POLICY IF EXISTS "Authenticated users can manage group_packages" ON public.group_packages;
DROP POLICY IF EXISTS "Allow public group_packages" ON public.group_packages;
CREATE POLICY "group_packages_allow_all" ON public.group_packages FOR ALL USING (true) WITH CHECK (true);

-- 10. package_departures
ALTER TABLE public.package_departures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "package_departures_allow_all" ON public.package_departures;
CREATE POLICY "package_departures_allow_all" ON public.package_departures FOR ALL USING (true) WITH CHECK (true);

-- 11. package_departure_flights
ALTER TABLE public.package_departure_flights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "package_departure_flights_allow_all" ON public.package_departure_flights;
CREATE POLICY "package_departure_flights_allow_all" ON public.package_departure_flights FOR ALL USING (true) WITH CHECK (true);

-- 12. tours
ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tours_allow_all" ON public.tours;
DROP POLICY IF EXISTS "Admins can manage tours" ON public.tours;
DROP POLICY IF EXISTS "Authenticated users can manage tours" ON public.tours;
DROP POLICY IF EXISTS "Anyone can view tours" ON public.tours;
CREATE POLICY "tours_allow_all" ON public.tours FOR ALL USING (true) WITH CHECK (true);

-- 13. transfers
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transfers_allow_all" ON public.transfers;
CREATE POLICY "transfers_allow_all" ON public.transfers FOR ALL USING (true) WITH CHECK (true);

-- 14. transfer_zones
ALTER TABLE public.transfer_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transfer_zones_allow_all" ON public.transfer_zones;
CREATE POLICY "transfer_zones_allow_all" ON public.transfer_zones FOR ALL USING (true) WITH CHECK (true);

-- 15. visas
ALTER TABLE public.visas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "visas_allow_all" ON public.visas;
DROP POLICY IF EXISTS "Anyone can view visas" ON public.visas;
DROP POLICY IF EXISTS "Authenticated users can manage visas" ON public.visas;
DROP POLICY IF EXISTS "Allow public visas" ON public.visas;
CREATE POLICY "visas_allow_all" ON public.visas FOR ALL USING (true) WITH CHECK (true);

-- 16. bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_allow_all" ON public.bookings;
CREATE POLICY "bookings_allow_all" ON public.bookings FOR ALL USING (true) WITH CHECK (true);

-- 17. profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_allow_all" ON public.profiles;
CREATE POLICY "profiles_allow_all" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 18. agency_profiles
ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agency_profiles_allow_all" ON public.agency_profiles;
CREATE POLICY "agency_profiles_allow_all" ON public.agency_profiles FOR ALL USING (true) WITH CHECK (true);

-- 19. saved_hotels
ALTER TABLE public.saved_hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saved_hotels_allow_all" ON public.saved_hotels;
CREATE POLICY "saved_hotels_allow_all" ON public.saved_hotels FOR ALL USING (true) WITH CHECK (true);

-- 20. saved_flights
ALTER TABLE public.saved_flights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saved_flights_allow_all" ON public.saved_flights;
CREATE POLICY "saved_flights_allow_all" ON public.saved_flights FOR ALL USING (true) WITH CHECK (true);

-- 21. system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_settings_allow_all" ON public.system_settings;
CREATE POLICY "system_settings_allow_all" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

-- 22. cities
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cities_allow_all" ON public.cities;
DROP POLICY IF EXISTS "Anyone can view cities" ON public.cities;
DROP POLICY IF EXISTS "Allow public cities" ON public.cities;
CREATE POLICY "cities_allow_all" ON public.cities FOR ALL USING (true) WITH CHECK (true);

-- 23. airports
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "airports_allow_all" ON public.airports;
CREATE POLICY "airports_allow_all" ON public.airports FOR ALL USING (true) WITH CHECK (true);

-- 24. airlines
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "airlines_allow_all" ON public.airlines;
CREATE POLICY "airlines_allow_all" ON public.airlines FOR ALL USING (true) WITH CHECK (true);

-- 25. countries
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "countries_allow_all" ON public.countries;
CREATE POLICY "countries_allow_all" ON public.countries FOR ALL USING (true) WITH CHECK (true);
