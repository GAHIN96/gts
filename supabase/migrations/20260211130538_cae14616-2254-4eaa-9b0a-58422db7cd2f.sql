
-- Create commission history table for tracking changes
CREATE TABLE public.commission_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  old_rate NUMERIC DEFAULT 0,
  new_rate NUMERIC NOT NULL,
  changed_by UUID,
  change_type TEXT NOT NULL DEFAULT 'per_agency', -- 'default' or 'per_agency'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_history ENABLE ROW LEVEL SECURITY;

-- Admins can manage all commission history
CREATE POLICY "Admins can manage commission history"
  ON public.commission_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Agencies can view their own commission history
CREATE POLICY "Agencies can view own commission history"
  ON public.commission_history FOR SELECT
  USING (agency_id IN (SELECT id FROM public.agencies WHERE user_id = auth.uid()));
