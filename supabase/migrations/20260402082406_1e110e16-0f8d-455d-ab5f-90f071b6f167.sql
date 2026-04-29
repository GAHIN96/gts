
-- ============================================
-- 1. Fix flight_default_fares: admin-only management, public SELECT
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage flight_default_fares" ON public.flight_default_fares;

CREATE POLICY "Admins can manage flight_default_fares"
  ON public.flight_default_fares FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view flight_default_fares"
  ON public.flight_default_fares FOR SELECT
  USING (true);

-- ============================================
-- 2. Fix flight_special_fares: admin-only management, public SELECT
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage flight_special_fares" ON public.flight_special_fares;

CREATE POLICY "Admins can manage flight_special_fares"
  ON public.flight_special_fares FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view flight_special_fares"
  ON public.flight_special_fares FOR SELECT
  USING (true);

-- ============================================
-- 3. Fix audit_logs: bind INSERT to caller's own user_id
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Users insert own audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. Fix user_sessions: only service_role can insert (edge function uses service_role)
-- ============================================
DROP POLICY IF EXISTS "Auth can insert sessions" ON public.user_sessions;

CREATE POLICY "Service role insert sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

-- ============================================
-- 5. Fix security_alerts: service_role only for INSERT
-- ============================================
DROP POLICY IF EXISTS "Service or auth can insert alerts" ON public.security_alerts;

CREATE POLICY "Service role insert alerts"
  ON public.security_alerts FOR INSERT
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );
