import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AvailableRouteFlight {
  id: string;
  airline: string;
  airline_logo: string | null;
  flight_number: string | null;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  departure_time: string | null;
  arrival_date: string;
  arrival_time: string | null;
  price: number;
  class: string | null;
  available_seats: number | null;
  departure_airport_code: string | null;
  arrival_airport_code: string | null;
}

export function useAvailableFlightsForRoute(params: {
  departureCity: string | null;
  arrivalCity: string | null;
  targetDate: string | null;
  enabled?: boolean;
}) {
  const { departureCity, arrivalCity, targetDate, enabled = true } = params;

  return useQuery({
    queryKey: ["available-route-flights", departureCity, arrivalCity, targetDate],
    enabled: enabled && !!departureCity && !!arrivalCity,
    queryFn: async () => {
      if (!departureCity || !arrivalCity) return [];

      const { data, error } = await supabase
        .from("flights")
        .select(
          "id, airline, airline_logo, flight_number, departure_city, arrival_city, departure_date, departure_time, arrival_date, arrival_time, price, class, available_seats, departure_airport_code, arrival_airport_code"
        )
        .eq("is_active", true)
        .ilike("departure_city", `%${departureCity}%`)
        .ilike("arrival_city", `%${arrivalCity}%`)
        .order("departure_date", { ascending: true });

      if (error) throw error;

      // If target date provided, sort by proximity
      if (targetDate) {
        const target = new Date(targetDate).getTime();
        return (data as AvailableRouteFlight[]).sort((a, b) => {
          const diffA = Math.abs(new Date(a.departure_date).getTime() - target);
          const diffB = Math.abs(new Date(b.departure_date).getTime() - target);
          return diffA - diffB;
        });
      }

      return data as AvailableRouteFlight[];
    },
  });
}
