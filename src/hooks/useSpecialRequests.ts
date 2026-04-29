import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SpecialRequest = {
  id: string;
  user_id: string;
  request_type: string;
  description: string;
  travelers: number | null;
  budget: number | null;
  status: string | null;
  priority: string | null;
  admin_response: string | null;
  created_at: string | null;
  updated_at: string | null;
  profiles?: {
    full_name: string | null;
    company_name: string | null;
  } | null;
};

export type SpecialRequestInsert = {
  user_id: string;
  request_type: string;
  description: string;
  travelers?: number;
  budget?: number;
  priority?: string;
};

export function useSpecialRequests() {
  return useQuery({
    queryKey: ["special-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SpecialRequest[];
    },
  });
}

export function useMySpecialRequests() {
  return useQuery({
    queryKey: ["my-special-requests"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("special_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SpecialRequest[];
    },
  });
}

export function useCreateSpecialRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SpecialRequestInsert) => {
      const { data, error } = await supabase
        .from("special_requests")
        .insert(request)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-special-requests"] });
    },
  });
}

export function useUpdateSpecialRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; admin_response?: string; priority?: string }) => {
      const { data, error } = await supabase
        .from("special_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-special-requests"] });
    },
  });
}

export function useSpecialRequestStats() {
  return useQuery({
    queryKey: ["special-request-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_requests")
        .select("id, status, priority");

      if (error) throw error;

      const total = data.length;
      const pending = data.filter(r => r.status === "pending").length;
      const resolved = data.filter(r => r.status === "resolved").length;
      const highPriority = data.filter(r => r.priority === "high").length;

      return { total, pending, resolved, highPriority };
    },
  });
}
