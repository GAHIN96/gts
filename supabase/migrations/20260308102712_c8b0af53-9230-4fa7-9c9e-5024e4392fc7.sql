
-- Tighten INSERT policies to require at least some context
-- Login attempts: only allow insert, never from anon without context
DROP POLICY "Allow insert login attempts" ON public.login_attempts;
CREATE POLICY "Service or auth can insert login attempts"
  ON public.login_attempts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role');

DROP POLICY "Allow insert lockouts" ON public.account_lockouts;
CREATE POLICY "Service or auth can insert lockouts"
  ON public.account_lockouts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role');

DROP POLICY "Allow update lockouts" ON public.account_lockouts;
CREATE POLICY "Service or admin can update lockouts"
  ON public.account_lockouts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role');

DROP POLICY "Allow insert sessions" ON public.user_sessions;
CREATE POLICY "Auth can insert sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "Allow update sessions" ON public.user_sessions;
CREATE POLICY "Auth can update own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY "Allow insert security alerts" ON public.security_alerts;
CREATE POLICY "Service or auth can insert alerts"
  ON public.security_alerts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role');
