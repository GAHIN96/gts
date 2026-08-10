import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type PackageDeparture = Tables<"package_departures">;
export type PackageDepartureInsert = TablesInsert<"package_departures">;
export type PackageDepartureUpdate = TablesUpdate<"package_departures">;

export function usePackageDepartures(packageId: string | null) {
  return useQuery({
    queryKey: ["package-departures", packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("package_departures")
        .select("*")
        .eq("package_id", packageId!)
        .order("departure_date", { ascending: true });

      if (error) throw error;
      return data as PackageDeparture[];
    },
    enabled: !!packageId,
  });
}

export function useCreateDeparture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (departure: PackageDepartureInsert) => {
      const { data, error } = await supabase
        .from("package_departures")
        .insert(departure)
        .select()
        ;

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["package-departures", data.package_id] });
      queryClient.invalidateQueries({ queryKey: ["package"] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function useUpdateDeparture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PackageDepartureUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("package_departures")
        .update(updates)
        .eq("id", id)
        .select()
        ;

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["package-departures", data.package_id] });
      queryClient.invalidateQueries({ queryKey: ["package"] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function useDeleteDeparture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, packageId }: { id: string; packageId: string }) => {
      const { error } = await supabase
        .from("package_departures")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return packageId;
    },
    onSuccess: (packageId) => {
      queryClient.invalidateQueries({ queryKey: ["package-departures", packageId] });
      queryClient.invalidateQueries({ queryKey: ["package"] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}
