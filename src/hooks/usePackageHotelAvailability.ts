import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PackageHotelAvailabilityRow {
  id: string;
  package_id: string;
  departure_id: string;
  hotel_id: string;
  available_rooms: number;
  booked_rooms: number;
}

export function usePackageHotelAvailability(packageId: string | null) {
  return useQuery({
    queryKey: ["package-hotel-availability", packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const { data, error } = await supabase
        .from("package_hotel_availability" as any)
        .select("*")
        .eq("package_id", packageId);
      if (error) throw error;
      return (data || []) as unknown as PackageHotelAvailabilityRow[];
    },
    enabled: !!packageId,
  });
}

export function useUpsertHotelAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      packageId,
      departureId,
      hotelId,
      availableRooms,
    }: {
      packageId: string;
      departureId: string;
      hotelId: string;
      availableRooms: number;
    }) => {
      // Check if row exists
      const { data: existing } = await supabase
        .from("package_hotel_availability" as any)
        .select("id")
        .eq("departure_id", departureId)
        .eq("hotel_id", hotelId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("package_hotel_availability" as any)
          .update({ available_rooms: availableRooms, updated_at: new Date().toISOString() } as any)
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("package_hotel_availability" as any)
          .insert({
            package_id: packageId,
            departure_id: departureId,
            hotel_id: hotelId,
            available_rooms: availableRooms,
            booked_rooms: 0,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, { packageId }) => {
      queryClient.invalidateQueries({ queryKey: ["package-hotel-availability", packageId] });
    },
  });
}
