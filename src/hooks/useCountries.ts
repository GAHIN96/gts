import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Country {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCountries() {
  const queryClient = useQueryClient();

  const { data: countries = [], isLoading } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("countries").select("*").order("name");
      if (error) throw error;
      return data as Country[];
    },
  });

  const createCountry = useMutation({
    mutationFn: async (country: { name: string; code: string; is_active?: boolean }) => {
      const { error } = await (supabase as any).from("countries").insert(country);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      toast.success("Country created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateCountry = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Country> & { id: string }) => {
      const { error } = await (supabase as any).from("countries").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      toast.success("Country updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCountry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("countries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      toast.success("Country deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { countries, isLoading, createCountry, updateCountry, deleteCountry };
}
