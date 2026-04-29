-- Create special_requests table
CREATE TABLE public.special_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL,
  description TEXT NOT NULL,
  travelers INTEGER DEFAULT 1,
  budget NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create additional_services table
CREATE TABLE public.additional_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  per_person BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.special_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.additional_services ENABLE ROW LEVEL SECURITY;

-- RLS policies for special_requests
CREATE POLICY "Users can view own requests" 
ON public.special_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own requests" 
ON public.special_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending requests" 
ON public.special_requests 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can manage all requests" 
ON public.special_requests 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for additional_services
CREATE POLICY "Anyone can view active services" 
ON public.additional_services 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage services" 
ON public.additional_services 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Add updated_at triggers
CREATE TRIGGER update_special_requests_updated_at
BEFORE UPDATE ON public.special_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_additional_services_updated_at
BEFORE UPDATE ON public.additional_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();