import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSavedHotels() {
  const { user } = useAuth();

  const { data: savedHotelIds = [], ...rest } = useQuery({
    queryKey: ["saved-hotels", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_hotels")
        .select("hotel_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((r) => r.hotel_id);
    },
    enabled: !!user,
  });

  return { savedHotelIds, ...rest };
}

export function useToggleSavedHotel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ hotelId, isSaved }: { hotelId: string; isSaved: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isSaved) {
        const { error } = await supabase
          .from("saved_hotels")
          .delete()
          .eq("user_id", user.id)
          .eq("hotel_id", hotelId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_hotels")
          .insert({ user_id: user.id, hotel_id: hotelId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-hotels", user?.id] });
    },
  });
}
