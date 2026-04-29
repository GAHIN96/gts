
-- Fix bookings RLS: Drop RESTRICTIVE policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Finance can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own draft bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Admins can manage all bookings" ON public.bookings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Finance can view all bookings" ON public.bookings
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Users can create bookings" ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own draft bookings" ON public.bookings
FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) AND (status = 'draft'::booking_status));

CREATE POLICY "Users can view own bookings" ON public.bookings
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Also fix payments RLS (same issue)
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Finance can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own pending payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;

CREATE POLICY "Admins can manage all payments" ON public.payments
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Finance can manage all payments" ON public.payments
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'finance'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Users can create payments" ON public.payments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending payments" ON public.payments
FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) AND (status = 'unpaid'::payment_status));

CREATE POLICY "Users can view own payments" ON public.payments
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Fix profiles RLS (admin needs to see agency profiles for booking details)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Fix agencies RLS
DROP POLICY IF EXISTS "Admins can manage all agencies" ON public.agencies;
DROP POLICY IF EXISTS "Users can insert own agency" ON public.agencies;
DROP POLICY IF EXISTS "Users can update own agency" ON public.agencies;
DROP POLICY IF EXISTS "Users can view own agency" ON public.agencies;

CREATE POLICY "Admins can manage all agencies" ON public.agencies
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own agency" ON public.agencies
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agency" ON public.agencies
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own agency" ON public.agencies
FOR SELECT TO authenticated
USING (auth.uid() = user_id);
