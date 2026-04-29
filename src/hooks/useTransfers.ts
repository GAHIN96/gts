import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Transfer {
  id: string;
  name: string;
  description: string | null;
  city_id: string | null;
  transfer_type: string;
  vehicle_type: string;
  capacity: number;
  price: number;
  route_from: string | null;
  route_to: string | null;
  price_per_passengers: number | null;
  image_url: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  cities?: {
    name: string;
    country: string;
  } | null;
}

export interface TransferInsert {
  name: string;
  description?: string | null;
  city_id?: string | null;
  transfer_type?: string;
  vehicle_type?: string;
  capacity?: number;
  price: number;
  route_from?: string | null;
  route_to?: string | null;
  price_per_passengers?: number | null;
  image_url?: string | null;
  is_active?: boolean | null;
}

export interface TransferUpdate extends Partial<TransferInsert> {
  id: string;
}

export const useTransfers = () => {
  return useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfers")
        .select(`
          *,
          cities (
            name,
            country
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Transfer[];
    },
  });
};

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transfer: TransferInsert) => {
      const { data, error } = await supabase
        .from("transfers")
        .insert(transfer)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
};

export const useUpdateTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TransferUpdate) => {
      const { data, error } = await supabase
        .from("transfers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
};

export const useDeleteTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transfers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
};
