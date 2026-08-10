import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Flight = Tables<"flights">;
export type FlightInsert = TablesInsert<"flights">;
export type FlightUpdate = TablesUpdate<"flights">;

export function useFlights() {
  return useQuery({
    queryKey: ["flights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flights")
        .select("*")
        .order("departure_date", { ascending: true });

      if (error) throw error;
      return data as Flight[];
    },
  });
}

export function useFlight(id: string) {
  return useQuery({
    queryKey: ["flight", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flights")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Flight | null;
    },
    enabled: !!id,
  });
}

export function useCreateFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flight: FlightInsert) => {
      const { data, error } = await supabase
        .from("flights")
        .insert(flight)
        .select()
        ;

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flights"] });
    },
  });
}

export function useUpdateFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: FlightUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("flights")
        .update(updates)
        .eq("id", id)
        .select()
        ;

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flights"] });
    },
  });
}

export function useDeleteFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("flights")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flights"] });
    },
  });
}

export function useFlightStats() {
  return useQuery({
    queryKey: ["flight-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flights")
        .select("id, available_seats, is_active");

      if (error) throw error;

      const total = data.length;
      const available = data.filter(f => f.is_active && (f.available_seats ?? 0) > 10).length;
      const limited = data.filter(f => f.is_active && (f.available_seats ?? 0) > 0 && (f.available_seats ?? 0) <= 10).length;
      const soldOut = data.filter(f => (f.available_seats ?? 0) === 0).length;

      return { total, available, limited, soldOut };
    },
  });
}
