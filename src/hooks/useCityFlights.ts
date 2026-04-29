import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Flight = Tables<"flights">;

export function useFlightsByCity(cityName: string | null) {
  return useQuery({
    queryKey: ["flights-by-city", cityName],
    queryFn: async () => {
      if (!cityName) return [];
      
      // Find flights where the arrival city matches the destination city
      const { data, error } = await supabase
        .from("flights")
        .select("*")
        .eq("is_active", true)
        .or(`arrival_city.ilike.%${cityName}%,departure_city.ilike.%${cityName}%`)
        .order("departure_date", { ascending: true });

      if (error) throw error;
      return data as Flight[];
    },
    enabled: !!cityName,
  });
}

export function useHotelsByCity(cityId: string | null) {
  return useQuery({
    queryKey: ["hotels-by-city", cityId],
    queryFn: async () => {
      if (!cityId) return [];
      
      const { data, error } = await supabase
        .from("hotels")
        .select(`
          *,
          cities (*),
          hotel_rooms (*)
        `)
        .eq("city_id", cityId)
        .eq("is_active", true)
        .order("star_rating", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!cityId,
  });
}
