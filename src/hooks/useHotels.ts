import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Hotel = Tables<"hotels"> & {
  cities?: Tables<"cities"> | null;
  hotel_rooms?: Tables<"hotel_rooms">[];
  hotel_special_prices?: Tables<"hotel_special_prices">[];
};
export type HotelInsert = TablesInsert<"hotels">;
export type HotelUpdate = TablesUpdate<"hotels">;

export function useHotels() {
  return useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select(`
          *,
          cities (*),
          hotel_rooms (*),
          hotel_special_prices (*)
        `)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Hotel[];
    },
  });
}

export function useHotel(id: string) {
  return useQuery({
    queryKey: ["hotel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select(`
          *,
          cities (*),
          hotel_rooms (*)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Hotel | null;
    },
    enabled: !!id,
  });
}

export function useCreateHotel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hotel: HotelInsert) => {
      const { data, error } = await supabase
        .from("hotels")
        .insert(hotel)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
    },
  });
}

export function useUpdateHotel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: HotelUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("hotels")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
    },
  });
}

export function useDeleteHotel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hotels")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
    },
  });
}

export function useHotelStats() {
  return useQuery({
    queryKey: ["hotel-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select("id, star_rating, is_active, cities!inner(country)");

      if (error) throw error;

      const total = data.length;
      const fiveStar = data.filter(h => h.star_rating === 5).length;
      const active = data.filter(h => h.is_active).length;
      const countries = new Set(data.map(h => (h.cities as any)?.country)).size;

      return { total, fiveStar, active, countries };
    },
  });
}
