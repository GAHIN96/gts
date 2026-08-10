import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FlightSeatBlock {
  id: string;
  flight_id: string;
  agency_id: string | null;
  blocked_seats: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  agency?: { id: string; agency_name: string } | null;
}

export function useFlightSeatBlocks(flightId: string) {
  return useQuery({
    queryKey: ["flight-seat-blocks", flightId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_seat_blocks" as any)
        .select("*, agency:agencies(id, agency_name)")
        .eq("flight_id", flightId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any[]) as FlightSeatBlock[];
    },
    enabled: !!flightId,
  });
}

export function useAllFlightSeatBlocks() {
  return useQuery({
    queryKey: ["flight-seat-blocks-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_seat_blocks" as any)
        .select("flight_id, blocked_seats, is_active");

      if (error) throw error;
      
      // Aggregate blocked seats per flight
      const map: Record<string, number> = {};
      (data as any[]).forEach((block: any) => {
        if (block.is_active) {
          map[block.flight_id] = (map[block.flight_id] || 0) + block.blocked_seats;
        }
      });
      return map;
    },
  });
}

export function useCreateSeatBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (block: { flight_id: string; agency_id?: string | null; blocked_seats: number; notes?: string }) => {
      const { data, error } = await supabase
        .from("flight_seat_blocks" as any)
        .insert(block)
        .select()
        ;
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["flight-seat-blocks", variables.flight_id] });
      queryClient.invalidateQueries({ queryKey: ["flight-seat-blocks-all"] });
    },
  });
}

export function useUpdateSeatBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; blocked_seats?: number; notes?: string; is_active?: boolean; agency_id?: string | null }) => {
      const { data, error } = await supabase
        .from("flight_seat_blocks" as any)
        .update(updates)
        .eq("id", id)
        .select()
        ;
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flight-seat-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["flight-seat-blocks-all"] });
    },
  });
}

export function useDeleteSeatBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("flight_seat_blocks" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flight-seat-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["flight-seat-blocks-all"] });
    },
  });
}
