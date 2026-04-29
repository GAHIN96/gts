import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PackageRate {
  id: string;
  package_id: string;
  hotel_id: string;
  guest_type: string;
  room_type: string;
  capacity: number;
  count: number;
  price: number;
  commission: number;
  created_at: string;
  updated_at: string;
}

export interface PackageRateInsert {
  package_id: string;
  hotel_id: string;
  guest_type: string;
  room_type: string;
  capacity: number;
  count: number;
  price: number;
  commission: number;
}

export function usePackageRates(packageId: string | null) {
  return useQuery({
    queryKey: ["package-rates", packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const { data, error } = await supabase
        .from("package_rates")
        .select("*")
        .eq("package_id", packageId)
        .order("guest_type", { ascending: true });
      if (error) throw error;
      return data as PackageRate[];
    },
    enabled: !!packageId,
  });
}

export function useSavePackageRates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      packageId,
      rates,
    }: {
      packageId: string;
      rates: Omit<PackageRateInsert, "package_id">[];
    }) => {
      // Delete existing rates
      const { error: deleteError } = await supabase
        .from("package_rates")
        .delete()
        .eq("package_id", packageId);
      if (deleteError) throw deleteError;

      // Insert new rates
      if (rates.length > 0) {
        const { error: insertError } = await supabase
          .from("package_rates")
          .insert(rates.map((r) => ({ ...r, package_id: packageId })));
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { packageId }) => {
      queryClient.invalidateQueries({ queryKey: ["package-rates", packageId] });
    },
  });
}
