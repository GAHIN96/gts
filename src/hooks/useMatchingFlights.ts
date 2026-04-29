import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Flight = Tables<"flights">;

interface MatchingFlightsParams {
  destinationCity: string | null;
  departureDate: string | null;
  returnDate: string | null;
}

export interface MatchedFlight extends Flight {
  matchScore: number;
  matchReason: string;
}

function calculateMatchScore(
  flight: Flight,
  departureDate: string | null,
  returnDate: string | null,
  isOutbound: boolean
): { score: number; reason: string } {
  const targetDate = isOutbound ? departureDate : returnDate;
  if (!targetDate) return { score: 0, reason: "No date specified" };

  const flightDate = new Date(flight.departure_date);
  const target = new Date(targetDate);
  const diffDays = Math.abs(Math.floor((flightDate.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) {
    return { score: 100, reason: "Exact date match" };
  } else if (diffDays === 1) {
    return { score: 80, reason: "1 day difference" };
  } else if (diffDays <= 3) {
    return { score: 60, reason: `${diffDays} days difference` };
  } else if (diffDays <= 7) {
    return { score: 40, reason: `${diffDays} days difference` };
  }
  return { score: 20, reason: `${diffDays}+ days difference` };
}

export function useMatchingFlights({
  destinationCity,
  departureDate,
  returnDate,
}: MatchingFlightsParams) {
  return useQuery({
    queryKey: ["matching-flights", destinationCity, departureDate, returnDate],
    queryFn: async () => {
      if (!destinationCity) return { outbound: [], return: [] };

      // Fetch all active flights involving the destination city
      const { data, error } = await supabase
        .from("flights")
        .select("*")
        .eq("is_active", true)
        
        .or(`arrival_city.ilike.%${destinationCity}%,departure_city.ilike.%${destinationCity}%`)
        .order("departure_date", { ascending: true });

      if (error) throw error;

      const flights = data as Flight[];

      // Separate outbound and return flights
      const outboundFlights: MatchedFlight[] = flights
        .filter(f => f.arrival_city?.toLowerCase().includes(destinationCity.toLowerCase()))
        .map(f => {
          const { score, reason } = calculateMatchScore(f, departureDate, returnDate, true);
          return { ...f, matchScore: score, matchReason: reason };
        })
        .sort((a, b) => b.matchScore - a.matchScore);

      const returnFlights: MatchedFlight[] = flights
        .filter(f => f.departure_city?.toLowerCase().includes(destinationCity.toLowerCase()))
        .map(f => {
          const { score, reason } = calculateMatchScore(f, departureDate, returnDate, false);
          return { ...f, matchScore: score, matchReason: reason };
        })
        .sort((a, b) => b.matchScore - a.matchScore);

      return { outbound: outboundFlights, return: returnFlights };
    },
    enabled: !!destinationCity,
  });
}
