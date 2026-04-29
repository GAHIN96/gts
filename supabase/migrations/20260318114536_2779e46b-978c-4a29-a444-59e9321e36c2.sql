-- Drop overly permissive SELECT policy on account_lockouts
DROP POLICY IF EXISTS "Allow select lockouts for checks" ON public.account_lockouts;

-- Drop overly permissive INSERT policy on account_lockouts
DROP POLICY IF EXISTS "Service or auth can insert lockouts" ON public.account_lockouts;

-- Drop overly permissive INSERT policy on login_attempts
DROP POLICY IF EXISTS "Service or auth can insert login attempts" ON public.login_attempts;