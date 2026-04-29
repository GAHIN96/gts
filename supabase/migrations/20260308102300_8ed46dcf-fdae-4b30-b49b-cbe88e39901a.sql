
-- Create role_permissions table for granular permission management
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module text NOT NULL,
  permission text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, module, permission)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Admin-only management
CREATE POLICY "Admins can manage permissions"
  ON public.role_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can read permissions (needed for permission checks)
CREATE POLICY "Authenticated users can view permissions"
  ON public.role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert default permissions for all 3 roles
-- Modules: packages, flights, hotels, tours, visas, transfers, special_requests, additional_services, bookings, payments, agencies, users, reports, settings

-- ADMIN: full access to everything
INSERT INTO public.role_permissions (role, module, permission, enabled) VALUES
  -- Packages
  ('admin', 'packages', 'view', true), ('admin', 'packages', 'create', true), ('admin', 'packages', 'edit', true), ('admin', 'packages', 'delete', true),
  -- Flights
  ('admin', 'flights', 'view', true), ('admin', 'flights', 'create', true), ('admin', 'flights', 'edit', true), ('admin', 'flights', 'delete', true),
  -- Hotels
  ('admin', 'hotels', 'view', true), ('admin', 'hotels', 'create', true), ('admin', 'hotels', 'edit', true), ('admin', 'hotels', 'delete', true),
  -- Tours
  ('admin', 'tours', 'view', true), ('admin', 'tours', 'create', true), ('admin', 'tours', 'edit', true), ('admin', 'tours', 'delete', true),
  -- Visas
  ('admin', 'visas', 'view', true), ('admin', 'visas', 'create', true), ('admin', 'visas', 'edit', true), ('admin', 'visas', 'delete', true),
  -- Transfers
  ('admin', 'transfers', 'view', true), ('admin', 'transfers', 'create', true), ('admin', 'transfers', 'edit', true), ('admin', 'transfers', 'delete', true),
  -- Special Requests
  ('admin', 'special_requests', 'view', true), ('admin', 'special_requests', 'create', true), ('admin', 'special_requests', 'edit', true), ('admin', 'special_requests', 'delete', true),
  -- Additional Services
  ('admin', 'additional_services', 'view', true), ('admin', 'additional_services', 'create', true), ('admin', 'additional_services', 'edit', true), ('admin', 'additional_services', 'delete', true),
  -- Bookings
  ('admin', 'bookings', 'view', true), ('admin', 'bookings', 'create', true), ('admin', 'bookings', 'edit', true), ('admin', 'bookings', 'delete', true), ('admin', 'bookings', 'approve', true),
  -- Payments
  ('admin', 'payments', 'view', true), ('admin', 'payments', 'create', true), ('admin', 'payments', 'approve', true), ('admin', 'payments', 'reject', true),
  -- Agencies
  ('admin', 'agencies', 'view', true), ('admin', 'agencies', 'create', true), ('admin', 'agencies', 'edit', true), ('admin', 'agencies', 'delete', true),
  -- Users & Roles
  ('admin', 'users', 'view', true), ('admin', 'users', 'create', true), ('admin', 'users', 'edit', true), ('admin', 'users', 'delete', true),
  -- Reports
  ('admin', 'reports', 'view', true), ('admin', 'reports', 'export', true),
  -- Settings
  ('admin', 'settings', 'view', true), ('admin', 'settings', 'edit', true),
  -- Audit Logs
  ('admin', 'audit_logs', 'view', true),
  -- Commission
  ('admin', 'commission', 'view', true), ('admin', 'commission', 'edit', true),
  -- Administration
  ('admin', 'administration', 'view', true), ('admin', 'administration', 'edit', true);

-- FINANCE: view bookings/payments/reports, approve payments
INSERT INTO public.role_permissions (role, module, permission, enabled) VALUES
  ('finance', 'packages', 'view', true), ('finance', 'flights', 'view', true), ('finance', 'hotels', 'view', true),
  ('finance', 'tours', 'view', true), ('finance', 'visas', 'view', true), ('finance', 'transfers', 'view', true),
  ('finance', 'special_requests', 'view', true), ('finance', 'additional_services', 'view', true),
  ('finance', 'bookings', 'view', true),
  ('finance', 'payments', 'view', true), ('finance', 'payments', 'approve', true), ('finance', 'payments', 'reject', true),
  ('finance', 'reports', 'view', true), ('finance', 'reports', 'export', true),
  ('finance', 'settings', 'view', true);

-- AGENCY: view travel modules, create bookings, manage own payments
INSERT INTO public.role_permissions (role, module, permission, enabled) VALUES
  ('agency', 'packages', 'view', true), ('agency', 'flights', 'view', true), ('agency', 'hotels', 'view', true),
  ('agency', 'tours', 'view', true), ('agency', 'visas', 'view', true), ('agency', 'transfers', 'view', true),
  ('agency', 'special_requests', 'view', true), ('agency', 'special_requests', 'create', true),
  ('agency', 'additional_services', 'view', true),
  ('agency', 'bookings', 'view', true), ('agency', 'bookings', 'create', true),
  ('agency', 'payments', 'view', true), ('agency', 'payments', 'create', true),
  ('agency', 'settings', 'view', true);

-- Index for fast lookups
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX idx_role_permissions_module ON public.role_permissions(module, permission);
