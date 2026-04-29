import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DepartureWithPackage {
  id: string;
  package_id: string;
  departure_date: string;
  return_date: string;
  price_per_person: number;
  total_seats: number;
  available_seats: number;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  group_packages: {
    id: string;
    name: string;
    nights: number;
    cities: {
      name: string;
      country: string;
    } | null;
  } | null;
}

export function useAllDepartures() {
  return useQuery({
    queryKey: ["all-departures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("package_departures")
        .select(`
          *,
          group_packages (
            id,
            name,
            nights,
            cities:cities!city_id (
              name,
              country
            )
          )
        `)
        .eq("is_active", true)
        .order("departure_date", { ascending: true });

      if (error) throw error;
      return data as DepartureWithPackage[];
    },
  });
}
