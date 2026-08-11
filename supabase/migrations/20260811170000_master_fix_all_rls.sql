-- MASTER RLS FIX: Loop safely over all existing public tables and grant full permissive access
DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
      'flight_default_fares',
      'flight_special_fares',
      'flights',
      'hotels',
      'hotel_rooms',
      'hotel_available_dates',
      'hotel_special_prices',
      'group_packages',
      'package_departures',
      'package_departure_flights',
      'tours',
      'transfers',
      'visas',
      'bookings',
      'profiles',
      'agency_profiles',
      'saved_hotels',
      'saved_flights',
      'system_settings',
      'cities',
      'airports',
      'airlines',
      'countries'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_allow_all', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Admins can manage %I" ON public.%I;', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can manage %I" ON public.%I;', tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Anyone can view %I" ON public.%I;', tbl, tbl);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl || '_allow_all', tbl);
        END IF;
    END LOOP;
END $$;
