import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type HotelAvailableDate = Tables<"hotel_available_dates">;

export function useHotelAvailableDates() {
  return useQuery({
    queryKey: ["hotel-available-dates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_available_dates")
        .select("*")
        .order("from_date", { ascending: true });

      if (error) throw error;
      return (data || []) as HotelAvailableDate[];
    },
  });
}
