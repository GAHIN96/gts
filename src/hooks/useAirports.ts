import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Airport {
  id: string;
  name: string;
  code: string;
  city_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  cities?: { name: string; country: string } | null;
}

export function useAirports() {
  const queryClient = useQueryClient();

  const { data: airports = [], isLoading } = useQuery({
    queryKey: ["airports"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("airports").select("*, cities(name, country)").order("name");
      if (error) throw error;
      return data as Airport[];
    },
  });

  const createAirport = useMutation({
    mutationFn: async (airport: { name: string; code: string; city_id?: string; is_active?: boolean }) => {
      const { error } = await (supabase as any).from("airports").insert(airport);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["airports"] });
      toast.success("Airport created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateAirport = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Airport> & { id: string }) => {
      const { error } = await (supabase as any).from("airports").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["airports"] });
      toast.success("Airport updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAirport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("airports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["airports"] });
      toast.success("Airport deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { airports, isLoading, createAirport, updateAirport, deleteAirport };
}
