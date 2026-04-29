import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FlightDeal {
  id: string;
  flight_id: string | null;
  title: string;
  description: string | null;
  original_price: number;
  discounted_price: number;
  discount_percent: number;
  image_url: string | null;
  expires_at: string | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  flight?: {
    id: string;
    airline: string;
    departure_city: string;
    arrival_city: string;
    departure_date: string;
    departure_time: string | null;
  } | null;
}

export interface FlightDealInsert {
  flight_id?: string | null;
  title: string;
  description?: string | null;
  original_price: number;
  discounted_price: number;
  discount_percent: number;
  image_url?: string | null;
  expires_at?: string | null;
  is_featured?: boolean;
  is_active?: boolean;
}

export const useFlightDeals = () => {
  return useQuery({
    queryKey: ['flight-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flight_deals')
        .select(`
          *,
          flight:flights(id, airline, departure_city, arrival_city, departure_date, departure_time)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FlightDeal[];
    },
  });
};

export const useActiveFlightDeals = () => {
  return useQuery({
    queryKey: ['flight-deals', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flight_deals')
        .select(`
          *,
          flight:flights(id, airline, departure_city, arrival_city, departure_date, departure_time)
        `)
        .eq('is_active', true)
        .order('is_featured', { ascending: false });

      if (error) throw error;
      return data as FlightDeal[];
    },
  });
};

export const useCreateFlightDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deal: FlightDealInsert) => {
      const { data, error } = await supabase
        .from('flight_deals')
        .insert(deal)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight-deals'] });
    },
  });
};

export const useUpdateFlightDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FlightDeal> & { id: string }) => {
      const { data, error } = await supabase
        .from('flight_deals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight-deals'] });
    },
  });
};

export const useDeleteFlightDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('flight_deals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight-deals'] });
    },
  });
};
