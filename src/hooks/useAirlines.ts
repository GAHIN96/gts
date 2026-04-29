import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Airline {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAirlines() {
  const queryClient = useQueryClient();

  const { data: airlines = [], isLoading } = useQuery({
    queryKey: ["airlines"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("airlines").select("*").order("name");
      if (error) throw error;
      return data as Airline[];
    },
  });

  const createAirline = useMutation({
    mutationFn: async (airline: { name: string; code: string; logo_url?: string; is_active?: boolean }) => {
      const { error } = await (supabase as any).from("airlines").insert(airline);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["airlines"] });
      toast.success("Airline created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateAirline = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Airline> & { id: string }) => {
      const { error } = await (supabase as any).from("airlines").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["airlines"] });
      toast.success("Airline updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAirline = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("airlines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["airlines"] });
      toast.success("Airline deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { airlines, isLoading, createAirline, updateAirline, deleteAirline };
}
