import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DepartureFlight {
  id: string;
  departure_id: string;
  flight_id: string;
  flight_type: "outbound" | "return";
  created_at: string;
  flights?: {
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
  };
}

export function usePackageDepartureFlights(departureId: string | null) {
  return useQuery({
    queryKey: ["package-departure-flights", departureId],
    queryFn: async () => {
      if (!departureId) return [];
      
      const { data, error } = await supabase
        .from("package_departure_flights")
        .select(`
          *,
          flights (
            id,
            airline,
            airline_logo,
            flight_number,
            departure_city,
            arrival_city,
            departure_date,
            departure_time,
            arrival_date,
            arrival_time,
            price,
            class,
            available_seats
          )
        `)
        .eq("departure_id", departureId);

      if (error) throw error;
      return data as DepartureFlight[];
    },
    enabled: !!departureId,
  });
}

export function useSetDepartureFlights() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      departureId,
      outboundFlightId,
      returnFlightId,
    }: {
      departureId: string;
      outboundFlightId: string | null;
      returnFlightId: string | null;
    }) => {
      // First delete existing flights for this departure
      await supabase
        .from("package_departure_flights")
        .delete()
        .eq("departure_id", departureId);

      const inserts = [];
      
      if (outboundFlightId) {
        inserts.push({
          departure_id: departureId,
          flight_id: outboundFlightId,
          flight_type: "outbound" as const,
        });
      }
      
      if (returnFlightId) {
        inserts.push({
          departure_id: departureId,
          flight_id: returnFlightId,
          flight_type: "return" as const,
        });
      }

      if (inserts.length > 0) {
        const { error } = await supabase
          .from("package_departure_flights")
          .insert(inserts);
        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["package-departure-flights", variables.departureId] });
      queryClient.invalidateQueries({ queryKey: ["departures"] });
    },
  });
}
