
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow inserts from triggers (service role / security definer functions)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create the trigger function for booking changes
CREATE OR REPLACE FUNCTION public.fn_notify_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booking_user_id uuid;
  _booking_number text;
  _old_status text;
  _new_status text;
  _admin_record RECORD;
  _agency_name text;
  _user_email text;
BEGIN
  _booking_user_id := NEW.user_id;
  _booking_number := NEW.booking_number;
  
  -- Get user email and agency name
  SELECT email INTO _user_email FROM public.profiles WHERE id = _booking_user_id LIMIT 1;
  SELECT a.agency_name INTO _agency_name FROM public.agencies a WHERE a.user_id = _booking_user_id LIMIT 1;

  IF TG_OP = 'UPDATE' THEN
    _old_status := OLD.status;
    _new_status := NEW.status;
    
    -- Notify the booking owner (agency) about status change
    IF _old_status IS DISTINCT FROM _new_status THEN
      INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
      VALUES (
        _booking_user_id,
        'Booking Status Updated',
        'Booking ' || _booking_number || ' status changed from ' || COALESCE(UPPER(REPLACE(_old_status, '_', ' ')), 'N/A') || ' to ' || UPPER(REPLACE(_new_status, '_', ' ')),
        CASE 
          WHEN _new_status = 'confirmed' THEN 'success'
          WHEN _new_status = 'canceled' THEN 'error'
          WHEN _new_status = 'refunded' THEN 'warning'
          ELSE 'info'
        END,
        '/bookings/' || NEW.id,
        jsonb_build_object('booking_id', NEW.id, 'booking_number', _booking_number, 'old_status', _old_status, 'new_status', _new_status)
      );
    END IF;

    -- Notify all admins about any booking update
    FOR _admin_record IN 
      SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' AND ur.user_id != auth.uid()
    LOOP
      IF _old_status IS DISTINCT FROM _new_status THEN
        INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
        VALUES (
          _admin_record.user_id,
          'Booking Updated',
          'Booking ' || _booking_number || ' (' || COALESCE(_agency_name, _user_email) || ') status: ' || UPPER(REPLACE(_new_status, '_', ' ')),
          'info',
          '/bookings/' || NEW.id,
          jsonb_build_object('booking_id', NEW.id, 'booking_number', _booking_number, 'new_status', _new_status, 'agency', COALESCE(_agency_name, _user_email))
        );
      END IF;
    END LOOP;

  ELSIF TG_OP = 'INSERT' THEN
    -- Notify all admins about new booking
    FOR _admin_record IN 
      SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
      VALUES (
        _admin_record.user_id,
        'New Booking Created',
        'New ' || NEW.booking_type || ' booking ' || _booking_number || ' by ' || COALESCE(_agency_name, _user_email, 'Unknown'),
        'info',
        '/bookings/' || NEW.id,
        jsonb_build_object('booking_id', NEW.id, 'booking_number', _booking_number, 'booking_type', NEW.booking_type, 'agency', COALESCE(_agency_name, _user_email))
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on bookings table
CREATE TRIGGER trg_notify_booking_change
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_booking_change();
