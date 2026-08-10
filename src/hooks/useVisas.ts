import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Visa = Tables<"visas">;
export type VisaInsert = TablesInsert<"visas">;
export type VisaUpdate = TablesUpdate<"visas">;

export function useVisas() {
  return useQuery({
    queryKey: ["visas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visas")
        .select("*")
        .order("country", { ascending: true });

      if (error) throw error;
      return data as Visa[];
    },
  });
}

export function useVisa(id: string) {
  return useQuery({
    queryKey: ["visa", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visas")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Visa | null;
    },
    enabled: !!id,
  });
}

export function useCreateVisa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visa: VisaInsert) => {
      const { data, error } = await supabase
        .from("visas")
        .insert(visa)
        .select()
        ;

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visas"] });
    },
  });
}

export function useUpdateVisa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: VisaUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("visas")
        .update(updates)
        .eq("id", id)
        .select()
        ;

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visas"] });
    },
  });
}

export function useDeleteVisa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("visas")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visas"] });
    },
  });
}

export function useVisaStats() {
  return useQuery({
    queryKey: ["visa-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visas")
        .select("id, is_active");

      if (error) throw error;

      const total = data.length;
      const active = data.filter(v => v.is_active).length;

      return { total, active };
    },
  });
}
