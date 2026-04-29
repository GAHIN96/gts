import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type GroupPackage = Tables<"group_packages"> & {
  cities: Tables<"cities"> | null;
  departure_city: Tables<"cities"> | null;
  package_departures: (Tables<"package_departures"> & {
    package_departure_flights: (Tables<"package_departure_flights"> & {
      flights: Tables<"flights"> | null;
    })[];
  })[];
};

export type PackageDeparture = Tables<"package_departures">;
export type GroupPackageInsert = TablesInsert<"group_packages">;
export type GroupPackageUpdate = TablesUpdate<"group_packages">;

export function usePackages() {
  return useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_packages")
        .select(`
          *,
          cities:cities!city_id (*),
          departure_city:cities!departure_city_id (*),
          package_departures (
            *,
            package_departure_flights (
              *,
              flights (*)
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GroupPackage[];
    },
  });
}

export function usePackage(id: string) {
  return useQuery({
    queryKey: ["package", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_packages")
        .select(`
          *,
          cities:cities!city_id (*),
          departure_city:cities!departure_city_id (*),
          package_departures (
            *,
            package_departure_flights (
              *,
              flights (*)
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as GroupPackage;
    },
    enabled: !!id,
  });
}

export function useCreatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pkg: GroupPackageInsert) => {
      const normalizedName = pkg.name.trim();
      const recentCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      let duplicateQuery = supabase
        .from("group_packages")
        .select("id")
        .eq("name", normalizedName)
        .eq("city_id", pkg.city_id)
        .gte("created_at", recentCutoff)
        .order("created_at", { ascending: false })
        .limit(1);

      if (typeof pkg.nights === "number") {
        duplicateQuery = duplicateQuery.eq("nights", pkg.nights);
      }

      if (typeof pkg.starting_price === "number") {
        duplicateQuery = duplicateQuery.eq("starting_price", pkg.starting_price);
      }

      const { data: existingPackage, error: duplicateCheckError } = await duplicateQuery.maybeSingle();

      if (duplicateCheckError) throw duplicateCheckError;
      if (existingPackage) {
        throw new Error("A similar package was just created. Please refresh and try again.");
      }

      const payload: GroupPackageInsert = {
        ...pkg,
        name: normalizedName,
      };

      const { data, error } = await supabase
        .from("group_packages")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function useUpdatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: GroupPackageUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("group_packages")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["package", data.id] });
      }
    },
  });
}

export function useDeletePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("group_packages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function usePackageHotels(cityId: string | null) {
  return useQuery({
    queryKey: ["hotels", cityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select(`
          *,
          hotel_rooms (*)
        `)
        .eq("city_id", cityId!)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
    enabled: !!cityId,
  });
}
