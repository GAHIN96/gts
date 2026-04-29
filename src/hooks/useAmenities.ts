import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Amenity {
  id: string;
  name: string;
  category: string;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAmenities() {
  const queryClient = useQueryClient();

  const { data: amenities = [], isLoading } = useQuery({
    queryKey: ["amenities"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("amenities").select("*").order("category").order("name");
      if (error) throw error;
      return data as Amenity[];
    },
  });

  const createAmenity = useMutation({
    mutationFn: async (amenity: { name: string; category: string; icon?: string; is_active?: boolean }) => {
      const { error } = await (supabase as any).from("amenities").insert(amenity);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
      toast.success("Amenity created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateAmenity = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Amenity> & { id: string }) => {
      const { error } = await (supabase as any).from("amenities").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
      toast.success("Amenity updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAmenity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("amenities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
      toast.success("Amenity deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { amenities, isLoading, createAmenity, updateAmenity, deleteAmenity };
}
