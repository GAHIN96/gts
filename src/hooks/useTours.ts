import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Tour = Tables<"tours"> & {
  cities?: Tables<"cities"> | null;
};
export type TourInsert = TablesInsert<"tours">;
export type TourUpdate = TablesUpdate<"tours">;

export function useTours() {
  return useQuery({
    queryKey: ["tours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select(`
          *,
          cities (*)
        `)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Tour[];
    },
  });
}

export function useTour(id: string) {
  return useQuery({
    queryKey: ["tour", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select(`
          *,
          cities (*)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Tour | null;
    },
    enabled: !!id,
  });
}

export function useCreateTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tour: TourInsert) => {
      const { data, error } = await supabase
        .from("tours")
        .insert(tour)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
    },
  });
}

export function useUpdateTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TourUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("tours")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
    },
  });
}

export function useDeleteTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tours")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
    },
  });
}

export function useTourStats() {
  return useQuery({
    queryKey: ["tour-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select("id, is_active");

      if (error) throw error;

      const total = data.length;
      const active = data.filter(t => t.is_active).length;

      return { total, active };
    },
  });
}
