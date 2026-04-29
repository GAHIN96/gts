import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FlightPriceTier {
  id: string;
  flight_id: string;
  min_passengers: number;
  max_passengers: number;
  price_per_seat: number;
  created_at: string;
  updated_at: string;
}

export function useFlightPriceTiers(flightId: string | null) {
  return useQuery({
    queryKey: ["flight-price-tiers", flightId],
    queryFn: async () => {
      if (!flightId) return [];
      const { data, error } = await supabase
        .from("flight_price_tiers" as any)
        .select("*")
        .eq("flight_id", flightId)
        .order("min_passengers", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as FlightPriceTier[];
    },
    enabled: !!flightId,
  });
}

export function useSaveFlightPriceTiers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      flightId,
      tiers,
    }: {
      flightId: string;
      tiers: { min_passengers: number; max_passengers: number; price_per_seat: number }[];
    }) => {
      // Delete existing tiers
      await (supabase.from("flight_price_tiers" as any) as any).delete().eq("flight_id", flightId);

      if (tiers.length === 0) return;

      // Insert new tiers
      const rows = tiers.map((t) => ({
        flight_id: flightId,
        min_passengers: t.min_passengers,
        max_passengers: t.max_passengers,
        price_per_seat: t.price_per_seat,
      }));

      const { error } = await (supabase.from("flight_price_tiers" as any) as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, { flightId }) => {
      queryClient.invalidateQueries({ queryKey: ["flight-price-tiers", flightId] });
      queryClient.invalidateQueries({ queryKey: ["flight-price-tiers"] });
    },
  });
}

/**
 * Calculate the effective price per seat based on passenger count and tiers.
 * Falls back to base flight price if no matching tier.
 */
export function getTieredPrice(
  basePrice: number,
  passengerCount: number,
  tiers: FlightPriceTier[]
): number {
  if (!tiers || tiers.length === 0) return basePrice;

  const matchingTier = tiers.find(
    (t) => passengerCount >= t.min_passengers && passengerCount <= t.max_passengers
  );

  return matchingTier ? matchingTier.price_per_seat : basePrice;
}
