import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FlightDefaultFare {
  id: string;
  flight_id: string;
  person_type: string;
  seat_from: number;
  seat_to: number;
  rate: number;
  commission: number;
}

export interface FlightSpecialFare {
  id: string;
  flight_id: string;
  from_date: string;
  to_date: string;
  person_type: string;
  seat_from: number;
  seat_to: number;
  rate: number;
  commission: number;
}

export function useFlightDefaultFares(flightId: string | null) {
  return useQuery({
    queryKey: ["flight-default-fares", flightId],
    queryFn: async () => {
      if (!flightId) return [];
      const { data, error } = await supabase
        .from("flight_default_fares" as any)
        .select("*")
        .eq("flight_id", flightId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as FlightDefaultFare[];
    },
    enabled: !!flightId,
  });
}

export function useFlightSpecialFares(flightId: string | null) {
  return useQuery({
    queryKey: ["flight-special-fares", flightId],
    queryFn: async () => {
      if (!flightId) return [];
      const { data, error } = await supabase
        .from("flight_special_fares" as any)
        .select("*")
        .eq("flight_id", flightId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as FlightSpecialFare[];
    },
    enabled: !!flightId,
  });
}

// Bulk fetch default fares for multiple flights (batched to avoid URL length limits)
export function useBulkFlightDefaultFares(flightIds: string[]) {
  const sortedKey = [...flightIds].sort().join(",");
  return useQuery({
    queryKey: ["flight-default-fares-bulk", sortedKey],
    queryFn: async () => {
      if (flightIds.length === 0) return {};
      const map: Record<string, FlightDefaultFare[]> = {};
      // Batch in chunks of 50 to avoid URL length limits
      const batchSize = 50;
      for (let i = 0; i < flightIds.length; i += batchSize) {
        const batch = flightIds.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from("flight_default_fares" as any)
          .select("*")
          .in("flight_id", batch);
        if (error) throw error;
        for (const row of (data || []) as unknown as FlightDefaultFare[]) {
          if (!map[row.flight_id]) map[row.flight_id] = [];
          map[row.flight_id].push(row);
        }
      }
      return map;
    },
    enabled: flightIds.length > 0,
  });
}

// Bulk fetch special fares for multiple flights (batched to avoid URL length limits)
export function useBulkFlightSpecialFares(flightIds: string[]) {
  const sortedKey = [...flightIds].sort().join(",");
  return useQuery({
    queryKey: ["flight-special-fares-bulk", sortedKey],
    queryFn: async () => {
      if (flightIds.length === 0) return {};
      const map: Record<string, FlightSpecialFare[]> = {};
      const batchSize = 50;
      for (let i = 0; i < flightIds.length; i += batchSize) {
        const batch = flightIds.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from("flight_special_fares" as any)
          .select("*")
          .in("flight_id", batch);
        if (error) throw error;
        for (const row of (data || []) as unknown as FlightSpecialFare[]) {
          if (!map[row.flight_id]) map[row.flight_id] = [];
          map[row.flight_id].push(row);
        }
      }
      return map;
    },
    enabled: flightIds.length > 0,
  });
}

export function useSaveFlightDefaultFares() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ flightId, fares }: { flightId: string; fares: Omit<FlightDefaultFare, "id" | "flight_id">[] }) => {
      await (supabase.from("flight_default_fares" as any) as any).delete().eq("flight_id", flightId);
      if (fares.length === 0) return;
      const rows = fares.map(f => ({ flight_id: flightId, ...f }));
      const { error } = await (supabase.from("flight_default_fares" as any) as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, { flightId }) => {
      qc.invalidateQueries({ queryKey: ["flight-default-fares", flightId] });
    },
  });
}

export function useSaveFlightSpecialFares() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ flightId, fares }: { flightId: string; fares: Omit<FlightSpecialFare, "id" | "flight_id">[] }) => {
      // Filter out rows with empty/invalid dates before saving
      const validFares = fares.filter(f => f.from_date && f.to_date && f.person_type);
      
      // Only delete existing fares if we have valid fares to insert, or if user explicitly cleared all
      if (validFares.length === 0 && fares.length > 0) {
        // User has rows but none are valid - don't delete, throw error
        throw new Error("Please fill in all date fields (From Date, To Date) and person type before saving");
      }
      
      await (supabase.from("flight_special_fares" as any) as any).delete().eq("flight_id", flightId);
      if (validFares.length === 0) return;
      const rows = validFares.map(f => ({ flight_id: flightId, ...f }));
      const { error } = await (supabase.from("flight_special_fares" as any) as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, { flightId }) => {
      qc.invalidateQueries({ queryKey: ["flight-special-fares", flightId] });
    },
  });
}
