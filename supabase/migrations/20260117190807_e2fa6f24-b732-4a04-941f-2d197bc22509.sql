-- Create flight_deals table for promotional flight offers
CREATE TABLE public.flight_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flight_id UUID REFERENCES public.flights(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  original_price NUMERIC NOT NULL,
  discounted_price NUMERIC NOT NULL,
  discount_percent INTEGER NOT NULL,
  image_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flight_deals ENABLE ROW LEVEL SECURITY;

-- Admins can manage flight deals
CREATE POLICY "Admins can manage flight deals"
ON public.flight_deals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active flight deals
CREATE POLICY "Anyone can view active flight deals"
ON public.flight_deals
FOR SELECT
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_flight_deals_updated_at
BEFORE UPDATE ON public.flight_deals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();