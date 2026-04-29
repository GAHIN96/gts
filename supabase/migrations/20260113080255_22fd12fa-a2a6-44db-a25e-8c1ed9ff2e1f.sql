-- Create hotel_deals table for standalone hotel offers
CREATE TABLE public.hotel_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
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

-- Create package_hotels junction table for multiple hotel tiers per package
CREATE TABLE public.package_hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.group_packages(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('3-star', '4-star', '5-star')),
  price_adjustment NUMERIC DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(package_id, hotel_id)
);

-- Enable RLS on both tables
ALTER TABLE public.hotel_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_hotels ENABLE ROW LEVEL SECURITY;

-- RLS policies for hotel_deals
CREATE POLICY "Admins can manage hotel deals" 
ON public.hotel_deals 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active hotel deals" 
ON public.hotel_deals 
FOR SELECT 
USING (is_active = true);

-- RLS policies for package_hotels
CREATE POLICY "Admins can manage package hotels" 
ON public.package_hotels 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view package hotels" 
ON public.package_hotels 
FOR SELECT 
USING (true);

-- Create trigger for updated_at on hotel_deals
CREATE TRIGGER update_hotel_deals_updated_at
BEFORE UPDATE ON public.hotel_deals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();