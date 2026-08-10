import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type HotelRoom = Tables<"hotel_rooms">;
export type HotelRoomInsert = TablesInsert<"hotel_rooms">;
export type HotelRoomUpdate = TablesUpdate<"hotel_rooms">;

export function useHotelRooms(hotelId: string | null) {
  return useQuery({
    queryKey: ["hotel-rooms", hotelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_rooms")
        .select("*")
        .eq("hotel_id", hotelId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as HotelRoom[];
    },
    enabled: !!hotelId,
  });
}

export function useCreateHotelRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (room: HotelRoomInsert) => {
      const { data, error } = await supabase
        .from("hotel_rooms")
        .insert(room)
        .select()
        ;

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["hotel-rooms", variables.hotel_id] });
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
    },
  });
}

export function useUpdateHotelRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: HotelRoomUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("hotel_rooms")
        .update(updates)
        .eq("id", id)
        .select()
        ;

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hotel-rooms", data.hotel_id] });
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
    },
  });
}

export function useDeleteHotelRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, hotelId }: { id: string; hotelId: string }) => {
      const { error } = await supabase
        .from("hotel_rooms")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { hotelId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["hotel-rooms", result.hotelId] });
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
    },
  });
}

export function useDeleteAllHotelRooms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hotelId: string) => {
      const { error } = await supabase
        .from('hotel_rooms')
        .delete()
        .eq('hotel_id', hotelId);

      if (error) throw error;
      return { hotelId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms', result.hotelId] });
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
    },
  });
}
