
-- Add new columns to audit_logs for comprehensive tracking
ALTER TABLE public.audit_logs 
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'data_change',
  ADD COLUMN IF NOT EXISTS entity_name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS user_email text;

-- Create index for searchability
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Make audit_logs immutable: deny UPDATE and DELETE
CREATE POLICY "Deny updates on audit logs"
  ON public.audit_logs FOR UPDATE
  USING (false);

CREATE POLICY "Deny deletes on audit logs"
  ON public.audit_logs FOR DELETE
  USING (false);

-- Trigger function for automatic audit logging on key tables
CREATE OR REPLACE FUNCTION public.fn_audit_log_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action text;
  _old_data jsonb;
  _new_data jsonb;
  _record_id uuid;
  _user_id uuid;
  _user_email text;
  _entity_name text;
  _description text;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    _action := 'create';
    _new_data := to_jsonb(NEW);
    _old_data := NULL;
    _record_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);
    _record_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete';
    _old_data := to_jsonb(OLD);
    _new_data := NULL;
    _record_id := OLD.id;
  END IF;

  -- Try to get current user
  BEGIN
    _user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    _user_id := NULL;
  END;

  -- Try to get user email from profiles
  IF _user_id IS NOT NULL THEN
    SELECT email INTO _user_email FROM public.profiles WHERE id = _user_id LIMIT 1;
  END IF;

  -- Build entity name based on table
  _entity_name := CASE TG_TABLE_NAME
    WHEN 'bookings' THEN COALESCE(_new_data->>'booking_number', _old_data->>'booking_number', '')
    WHEN 'payments' THEN COALESCE(_new_data->>'transaction_reference', _old_data->>'transaction_reference', '')
    WHEN 'user_roles' THEN COALESCE(_new_data->>'role', _old_data->>'role', '')
    WHEN 'agencies' THEN COALESCE(_new_data->>'agency_name', _old_data->>'agency_name', '')
    WHEN 'flights' THEN COALESCE(_new_data->>'flight_number', _old_data->>'flight_number', '')
    WHEN 'hotels' THEN COALESCE(_new_data->>'name', _old_data->>'name', '')
    WHEN 'group_packages' THEN COALESCE(_new_data->>'name', _old_data->>'name', '')
    WHEN 'profiles' THEN COALESCE(_new_data->>'email', _old_data->>'email', '')
    ELSE ''
  END;

  -- Build description
  _description := TG_OP || ' on ' || TG_TABLE_NAME;

  -- Determine event type
  INSERT INTO public.audit_logs (
    action, table_name, record_id, old_data, new_data, 
    user_id, event_type, entity_name, description, user_email
  ) VALUES (
    _action,
    TG_TABLE_NAME,
    _record_id,
    _old_data,
    _new_data,
    _user_id,
    CASE TG_TABLE_NAME
      WHEN 'bookings' THEN 'booking'
      WHEN 'payments' THEN 'financial'
      WHEN 'user_roles' THEN 'permission'
      WHEN 'profiles' THEN 'user'
      WHEN 'agencies' THEN 'agency'
      ELSE 'data_change'
    END,
    _entity_name,
    _description,
    _user_email
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers to key tables
CREATE TRIGGER trg_audit_bookings
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_agencies
  AFTER INSERT OR UPDATE OR DELETE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_flights
  AFTER INSERT OR UPDATE OR DELETE ON public.flights
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_hotels
  AFTER INSERT OR UPDATE OR DELETE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();

CREATE TRIGGER trg_audit_group_packages
  AFTER INSERT OR UPDATE OR DELETE ON public.group_packages
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();
