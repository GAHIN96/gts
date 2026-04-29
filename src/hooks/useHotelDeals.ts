import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type HotelDeal = Tables<"hotel_deals"> & {
  hotels?: Tables<"hotels"> | null;
};
export type HotelDealInsert = TablesInsert<"hotel_deals">;
export type HotelDealUpdate = TablesUpdate<"hotel_deals">;

export function useHotelDeals() {
  return useQuery({
    queryKey: ["hotel-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_deals")
        .select(`
          *,
          hotels (*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HotelDeal[];
    },
  });
}

export function useActiveHotelDeals() {
  return useQuery({
    queryKey: ["hotel-deals", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_deals")
        .select(`
          *,
          hotels (*)
        `)
        .eq("is_active", true)
        .order("is_featured", { ascending: false });

      if (error) throw error;
      return data as HotelDeal[];
    },
  });
}

export function useCreateHotelDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deal: HotelDealInsert) => {
      const { data, error } = await supabase
        .from("hotel_deals")
        .insert(deal)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-deals"] });
    },
  });
}

export function useUpdateHotelDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: HotelDealUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("hotel_deals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-deals"] });
    },
  });
}

export function useDeleteHotelDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hotel_deals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-deals"] });
    },
  });
}
