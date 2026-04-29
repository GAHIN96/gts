import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VisaPrice {
  id: string;
  visa_id: string;
  min_age: number;
  max_age: number;
  price: number;
  commission: number;
}

export function useVisaPrices(visaId: string | undefined) {
  return useQuery({
    queryKey: ["visa-prices", visaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visa_prices")
        .select("*")
        .eq("visa_id", visaId!)
        .order("min_age", { ascending: true });
      if (error) throw error;
      return data as VisaPrice[];
    },
    enabled: !!visaId,
  });
}

export function useSaveVisaPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ visaId, prices }: { visaId: string; prices: Omit<VisaPrice, "id" | "visa_id">[] }) => {
      // Delete existing prices
      await supabase.from("visa_prices").delete().eq("visa_id", visaId);

      if (prices.length > 0) {
        const { error } = await supabase
          .from("visa_prices")
          .insert(prices.map(p => ({ ...p, visa_id: visaId })));
        if (error) throw error;
      }
    },
    onSuccess: (_, { visaId }) => {
      queryClient.invalidateQueries({ queryKey: ["visa-prices", visaId] });
    },
  });
}
