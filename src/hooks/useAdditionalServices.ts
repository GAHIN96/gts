import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdditionalService = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  per_person: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdditionalServiceInsert = {
  name: string;
  category: string;
  description?: string;
  price: number;
  per_person?: boolean;
  is_active?: boolean;
};

export function useAdditionalServices() {
  return useQuery({
    queryKey: ["additional-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("additional_services")
        .select("*")
        .order("category", { ascending: true });

      if (error) throw error;
      return data as AdditionalService[];
    },
  });
}

export function useCreateAdditionalService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (service: AdditionalServiceInsert) => {
      const { data, error } = await supabase
        .from("additional_services")
        .insert(service)
        .select()
        ;

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["additional-services"] });
    },
  });
}

export function useUpdateAdditionalService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; category?: string; description?: string; price?: number; per_person?: boolean; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from("additional_services")
        .update(updates)
        .eq("id", id)
        .select()
        ;

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["additional-services"] });
    },
  });
}

export function useDeleteAdditionalService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("additional_services")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["additional-services"] });
    },
  });
}

export function useAdditionalServiceStats() {
  return useQuery({
    queryKey: ["additional-service-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("additional_services")
        .select("id, is_active");

      if (error) throw error;

      const total = data.length;
      const active = data.filter(s => s.is_active).length;

      return { total, active };
    },
  });
}
