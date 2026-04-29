import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SuggestedFlight {
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
}

function scoreByDateDistance(flightDate: string, targetDate: string) {
  const a = new Date(flightDate);
  const b = new Date(targetDate);
  const diffDays = Math.abs(Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return 100;
  if (diffDays === 1) return 80;
  if (diffDays <= 3) return 60;
  if (diffDays <= 7) return 40;
  return 20;
}

export function useSuggestedRoundTripFlights(params: {
  destinationCity: string | null;
  departureDate: string | null;
  returnDate: string | null;
}) {
  const { destinationCity, departureDate, returnDate } = params;

  return useQuery({
    queryKey: ["suggested-roundtrip-flights", destinationCity, departureDate, returnDate],
    enabled: !!destinationCity && !!departureDate && !!returnDate,
    queryFn: async () => {
      if (!destinationCity || !departureDate || !returnDate) {
        return { outbound: null as SuggestedFlight | null, return: null as SuggestedFlight | null };
      }

      // Fetch flights that either arrive at or depart from the destination city.
      const { data, error } = await supabase
        .from("flights")
        .select(
          "id, airline, airline_logo, flight_number, departure_city, arrival_city, departure_date, departure_time, arrival_date, arrival_time, price, class, available_seats"
        )
        .eq("is_active", true)
        .or(`arrival_city.ilike.%${destinationCity}%,departure_city.ilike.%${destinationCity}%`)
        .order("departure_date", { ascending: true });

      if (error) throw error;

      const flights = (data || []) as SuggestedFlight[];

      const outboundCandidates = flights
        .filter((f) => f.arrival_city?.toLowerCase().includes(destinationCity.toLowerCase()))
        .map((f) => ({ f, score: scoreByDateDistance(f.departure_date, departureDate) }))
        .sort((a, b) => b.score - a.score);

      const returnCandidates = flights
        .filter((f) => f.departure_city?.toLowerCase().includes(destinationCity.toLowerCase()))
        .map((f) => ({ f, score: scoreByDateDistance(f.departure_date, returnDate) }))
        .sort((a, b) => b.score - a.score);

      return {
        outbound: outboundCandidates[0]?.f ?? null,
        return: returnCandidates[0]?.f ?? null,
      };
    },
  });
}
