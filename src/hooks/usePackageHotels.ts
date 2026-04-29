import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type PackageHotel = Tables<"package_hotels"> & {
  hotels?: Tables<"hotels"> | null;
};
export type PackageHotelInsert = TablesInsert<"package_hotels">;

export function usePackageHotelsByPackage(packageId: string | null) {
  return useQuery({
    queryKey: ["package-hotels", packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const { data, error } = await supabase
        .from("package_hotels")
        .select(`
          *,
          hotels (
            *,
            cities (*)
          )
        `)
        .eq("package_id", packageId)
        .order("tier", { ascending: true });

      if (error) throw error;
      return data as PackageHotel[];
    },
    enabled: !!packageId,
  });
}

export function useSavePackageHotels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      packageId, 
      hotels 
    }: { 
      packageId: string; 
      hotels: Omit<PackageHotelInsert, "package_id">[] 
    }) => {
      // Delete existing package hotels
      const { error: deleteError } = await supabase
        .from("package_hotels")
        .delete()
        .eq("package_id", packageId);

      if (deleteError) throw deleteError;

      // Insert new package hotels
      if (hotels.length > 0) {
        const { error: insertError } = await supabase
          .from("package_hotels")
          .insert(hotels.map(h => ({ ...h, package_id: packageId })));

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { packageId }) => {
      queryClient.invalidateQueries({ queryKey: ["package-hotels", packageId] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}
