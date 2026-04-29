
-- Drop the overly permissive insert policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- The trigger function runs as SECURITY DEFINER which bypasses RLS,
-- so we don't need a permissive insert policy. 
-- Only admins should be able to manually insert notifications.
