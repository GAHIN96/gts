-- Fix overly permissive INSERT policy on pnr_booking_changes
-- Currently any authenticated user can insert changes for ANY PNR booking
DROP POLICY IF EXISTS "Authenticated can insert pnr changes" ON public.pnr_booking_changes;

CREATE POLICY "Users can insert changes for own pnr bookings"
ON public.pnr_booking_changes FOR INSERT TO authenticated
WITH CHECK (
  pnr_booking_id IN (
    SELECT id FROM public.pnr_bookings
    WHERE user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);