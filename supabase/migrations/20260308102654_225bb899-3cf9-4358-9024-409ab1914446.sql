
-- Login attempts tracking for rate limiting and lockout
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempts
CREATE POLICY "Admins can view login attempts"
  ON public.login_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow inserts from edge function (service role) and authenticated
CREATE POLICY "Allow insert login attempts"
  ON public.login_attempts FOR INSERT
  WITH CHECK (true);

-- Deny update/delete for immutability
CREATE POLICY "Deny update login attempts"
  ON public.login_attempts FOR UPDATE USING (false);
CREATE POLICY "Deny delete login attempts"
  ON public.login_attempts FOR DELETE USING (false);

CREATE INDEX idx_login_attempts_email ON public.login_attempts(email, created_at DESC);
CREATE INDEX idx_login_attempts_created ON public.login_attempts(created_at DESC);

-- Account lockouts
CREATE TABLE public.account_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz NOT NULL,
  failure_count integer NOT NULL DEFAULT 0,
  unlocked_by uuid,
  unlocked_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lockouts"
  ON public.account_lockouts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow reading lockout status for login checks (via edge function with service role)
CREATE POLICY "Allow select lockouts for checks"
  ON public.account_lockouts FOR SELECT
  USING (true);

CREATE POLICY "Allow insert lockouts"
  ON public.account_lockouts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update lockouts"
  ON public.account_lockouts FOR UPDATE
  USING (true);

CREATE INDEX idx_account_lockouts_email ON public.account_lockouts(email);

-- User sessions tracking
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  ip_address text,
  user_agent text,
  device_info text,
  location text,
  is_suspicious boolean NOT NULL DEFAULT false,
  suspicious_reason text,
  logged_in_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow insert sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update sessions"
  ON public.user_sessions FOR UPDATE
  USING (true);

CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id, logged_in_at DESC);
CREATE INDEX idx_user_sessions_suspicious ON public.user_sessions(is_suspicious) WHERE is_suspicious = true;

-- Security alerts table
CREATE TABLE public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  email text,
  user_id uuid,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security alerts"
  ON public.security_alerts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Allow insert security alerts"
  ON public.security_alerts FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_security_alerts_created ON public.security_alerts(created_at DESC);
CREATE INDEX idx_security_alerts_unresolved ON public.security_alerts(is_resolved) WHERE is_resolved = false;
