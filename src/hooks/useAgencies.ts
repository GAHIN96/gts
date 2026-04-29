import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Agency = Tables<"agencies"> & {
  profiles?: {
    email: string;
    full_name: string | null;
    phone: string | null;
  } | null;
  bookingStats?: {
    totalBookings: number;
    totalRevenue: number;
  };
};

export type AgencyInsert = TablesInsert<"agencies">;
export type AgencyUpdate = TablesUpdate<"agencies">;

export const useAgencies = () => {
  return useQuery({
    queryKey: ["agencies"],
    queryFn: async () => {
      // Fetch agencies
      const { data: agencies, error } = await supabase
        .from("agencies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles and stats for each agency
      const agenciesWithDetails = await Promise.all(
        (agencies || []).map(async (agency) => {
          // Get profile info
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name, phone")
            .eq("id", agency.user_id)
            .single();

          // Get booking stats
          const { data: bookings } = await supabase
            .from("bookings")
            .select("total_amount, status")
            .eq("user_id", agency.user_id);

          const confirmedBookings = bookings?.filter(b => b.status === "confirmed") || [];
          
          return {
            ...agency,
            profiles: profile || null,
            bookingStats: {
              totalBookings: bookings?.length || 0,
              totalRevenue: confirmedBookings.reduce((sum, b) => sum + b.total_amount, 0),
            },
          } as Agency;
        })
      );

      return agenciesWithDetails;
    },
  });
};

export const useAgency = (id: string) => {
  return useQuery({
    queryKey: ["agencies", id],
    queryFn: async () => {
      const { data: agency, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Get profile info
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name, phone")
        .eq("id", agency.user_id)
        .single();

      return {
        ...agency,
        profiles: profile || null,
      } as Agency;
    },
    enabled: !!id,
  });
};

export const useCreateAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agency: AgencyInsert) => {
      const { data, error } = await supabase
        .from("agencies")
        .insert(agency)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
  });
};

export const useUpdateAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AgencyUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("agencies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
  });
};

export const useVerifyAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isVerified }: { id: string; isVerified: boolean }) => {
      const { data, error } = await supabase
        .from("agencies")
        .update({ is_verified: isVerified })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
  });
};

export const useToggleAgencyStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from("agencies")
        .update({ is_active: isActive })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
  });
};

export const useDeleteAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
  });
};

export const useToggleMfaRequired = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, mfaRequired }: { id: string; mfaRequired: boolean }) => {
      const { data, error } = await supabase
        .from("agencies")
        .update({ mfa_required: mfaRequired } as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
  });
};

export const useUpdateAgencyCredit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      creditLimit, 
      creditLimitType 
    }: { 
      id: string; 
      creditLimit: number;
      creditLimitType: 'soft' | 'hard';
    }) => {
      const { data, error } = await supabase
        .from("agencies")
        .update({ 
          credit_limit: creditLimit,
          credit_limit_type: creditLimitType
        } as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
  });
};
