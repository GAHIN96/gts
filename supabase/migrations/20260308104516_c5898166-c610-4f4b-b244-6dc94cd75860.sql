-- Add 2FA requirement and credit limit columns to agencies
ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS mfa_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_limit_type text DEFAULT 'soft',
ADD COLUMN IF NOT EXISTS used_credit numeric DEFAULT 0;

-- Add constraint for credit_limit_type
ALTER TABLE public.agencies
ADD CONSTRAINT agencies_credit_limit_type_check 
CHECK (credit_limit_type IN ('soft', 'hard'));

-- Create agency_credit_transactions table for tracking
CREATE TABLE IF NOT EXISTS public.agency_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('booking', 'payment', 'adjustment', 'refund')),
  description text,
  balance_after numeric NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for agency_credit_transactions
CREATE POLICY "Admins can manage credit transactions"
ON public.agency_credit_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance can view credit transactions"
ON public.agency_credit_transactions FOR SELECT
USING (has_role(auth.uid(), 'finance'));

CREATE POLICY "Agencies can view own transactions"
ON public.agency_credit_transactions FOR SELECT
USING (agency_id IN (SELECT id FROM agencies WHERE user_id = auth.uid()));