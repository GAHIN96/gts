import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PackageSpecialRate {
  id: string;
  package_id: string;
  hotel_id: string;
  departure_date: string;
  return_date: string;
  guest_type: string;
  room_type: string;
  price: number;
  commission: number;
  created_at: string;
  updated_at: string;
}

export interface PackageSpecialRateInsert {
  package_id: string;
  hotel_id: string;
  departure_date: string;
  return_date: string;
  guest_type: string;
  room_type: string;
  price: number;
  commission: number;
}

export function usePackageSpecialRates(packageId: string | null) {
  return useQuery({
    queryKey: ["package-special-rates", packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const { data, error } = await supabase
        .from("package_special_rates")
        .select("*")
        .eq("package_id", packageId)
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return data as PackageSpecialRate[];
    },
    enabled: !!packageId,
  });
}

export function useSavePackageSpecialRates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      packageId,
      rates,
    }: {
      packageId: string;
      rates: Omit<PackageSpecialRateInsert, "package_id">[];
    }) => {
      const { error: deleteError } = await supabase
        .from("package_special_rates")
        .delete()
        .eq("package_id", packageId);
      if (deleteError) throw deleteError;

      if (rates.length > 0) {
        const { error: insertError } = await supabase
          .from("package_special_rates")
          .insert(rates.map((r) => ({ ...r, package_id: packageId })));
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { packageId }) => {
      queryClient.invalidateQueries({ queryKey: ["package-special-rates", packageId] });
    },
  });
}
