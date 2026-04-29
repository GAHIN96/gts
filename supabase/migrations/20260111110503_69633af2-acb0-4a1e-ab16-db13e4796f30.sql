-- Create transfers table
CREATE TABLE public.transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  city_id UUID REFERENCES public.cities(id),
  transfer_type TEXT NOT NULL DEFAULT 'airport', -- airport, city, intercity
  vehicle_type TEXT NOT NULL DEFAULT 'sedan', -- sedan, suv, van, bus
  capacity INTEGER NOT NULL DEFAULT 4,
  price NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage transfers" 
ON public.transfers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active transfers" 
ON public.transfers 
FOR SELECT 
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_transfers_updated_at
BEFORE UPDATE ON public.transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();