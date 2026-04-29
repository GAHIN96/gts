
CREATE OR REPLACE FUNCTION public.fn_notify_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booking_user_id uuid;
  _booking_number text;
  _payment_status text;
  _old_status text;
  _amount numeric;
  _admin_record RECORD;
  _agency_name text;
  _user_email text;
BEGIN
  _payment_status := NEW.status;
  _amount := NEW.amount;

  -- Get booking info
  SELECT b.user_id, b.booking_number
  INTO _booking_user_id, _booking_number
  FROM public.bookings b
  WHERE b.id = NEW.booking_id
  LIMIT 1;

  IF _booking_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get agency info
  SELECT email INTO _user_email FROM public.profiles WHERE id = _booking_user_id LIMIT 1;
  SELECT a.agency_name INTO _agency_name FROM public.agencies a WHERE a.user_id = _booking_user_id LIMIT 1;

  IF TG_OP = 'UPDATE' THEN
    _old_status := OLD.status;
    
    IF _old_status IS DISTINCT FROM _payment_status THEN
      -- Notify the agency about their payment status
      INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
      VALUES (
        _booking_user_id,
        'Payment ' || INITCAP(REPLACE(_payment_status, '_', ' ')),
        'Payment of $' || _amount || ' for booking ' || _booking_number || ' has been ' || REPLACE(_payment_status, '_', ' '),
        CASE 
          WHEN _payment_status = 'approved' THEN 'success'
          WHEN _payment_status = 'rejected' THEN 'error'
          WHEN _payment_status = 'refunded' THEN 'warning'
          ELSE 'info'
        END,
        '/bookings/' || NEW.booking_id,
        jsonb_build_object('booking_id', NEW.booking_id, 'payment_id', NEW.id, 'booking_number', _booking_number, 'payment_status', _payment_status, 'amount', _amount)
      );

      -- Notify admins about payment updates (e.g. proof_uploaded)
      IF _payment_status = 'proof_uploaded' THEN
        FOR _admin_record IN 
          SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
        LOOP
          INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
          VALUES (
            _admin_record.user_id,
            'Payment Proof Uploaded',
            'Payment proof uploaded for booking ' || _booking_number || ' ($' || _amount || ') by ' || COALESCE(_agency_name, _user_email, 'Unknown'),
            'info',
            '/payments',
            jsonb_build_object('booking_id', NEW.booking_id, 'payment_id', NEW.id, 'booking_number', _booking_number, 'agency', COALESCE(_agency_name, _user_email))
          );
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_payment_change
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_payment_change();
