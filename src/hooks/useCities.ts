import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type City = Tables<"cities">;

export function useCities() {
  return useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as City[];
    },
  });
}

export function useCreateCity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (city: TablesInsert<"cities">) => {
      const { data, error } = await supabase
        .from("cities")
        .insert(city)
        .select()
        ;

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
  });
}
