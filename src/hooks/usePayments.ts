import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Payment = Tables<"payments"> & {
  bookings?: (Tables<"bookings"> & {
    package_departures?: (Tables<"package_departures"> & {
      group_packages?: (Tables<"group_packages"> & {
        cities?: Tables<"cities"> | null;
      }) | null;
    }) | null;
  }) | null;
};

export type PaymentInsert = TablesInsert<"payments">;
export type PaymentUpdate = TablesUpdate<"payments">;

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          bookings (
            *,
            package_departures (
              *,
              group_packages (
                *,
                cities:cities!city_id (*)
              )
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ["payment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          bookings (
            *,
            package_departures (
              *,
              group_packages (
                *,
                cities:cities!city_id (*)
              )
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Payment;
    },
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: Omit<PaymentInsert, "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("payments")
        .insert({
          ...payment,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useApprovePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Update payment status
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq("id", id)
        .select("booking_id")
        .single();

      if (paymentError) throw paymentError;

      // Update booking status to confirmed
      if (payment?.booking_id) {
        const { error: bookingError } = await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", payment.booking_id);

        if (bookingError) throw bookingError;
      }

      // Send email notification with voucher
      try {
        await supabase.functions.invoke("payment-notification", {
          body: { paymentId: id, action: "approved" },
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't throw - payment was approved successfully, email is secondary
      }

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useRejectPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data, error } = await supabase
        .from("payments")
        .update({
          status: "rejected",
          rejection_reason: reason || "Payment rejected by admin",
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke("payment-notification", {
          body: { paymentId: id, action: "rejected", rejectionReason: reason },
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't throw - rejection was processed, email is secondary
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PaymentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("payments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}
