import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type PackageDepartureFlightWithDetails = Tables<"package_departure_flights"> & {
  flights?: Tables<"flights"> | null;
};

export type Booking = Tables<"bookings"> & {
  package_departures?: (Tables<"package_departures"> & {
    group_packages?: (Tables<"group_packages"> & {
      cities?: Tables<"cities"> | null;
    }) | null;
    package_departure_flights?: PackageDepartureFlightWithDetails[];
  }) | null;
  flights?: Tables<"flights"> | null;
  hotels?: (Tables<"hotels"> & {
    cities?: Tables<"cities"> | null;
  }) | null;
  tours?: (Tables<"tours"> & {
    cities?: Tables<"cities"> | null;
  }) | null;
  visas?: Tables<"visas"> | null;
  profiles?: Tables<"profiles"> | null;
  agencies?: Tables<"agencies"> | null;
};

export type BookingInsert = TablesInsert<"bookings">;
export type BookingUpdate = TablesUpdate<"bookings">;

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          package_departures (
            *,
            group_packages (
              *,
              cities:cities!city_id (*)
            ),
            package_departure_flights (
              *,
              flights (*)
            )
          ),
          flights (*),
          hotels (
            *,
            cities (*)
          ),
          tours (
            *,
            cities (*)
          ),
          visas (*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles and agencies for each booking
      const bookingsWithProfiles = await Promise.all(
        (data || []).map(async (booking) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", booking.user_id)
            .maybeSingle();
          
          const { data: agency } = await supabase
            .from("agencies")
            .select("*")
            .eq("user_id", booking.user_id)
            .maybeSingle();
          
          return {
            ...booking,
            profiles: profile,
            agencies: agency,
          };
        })
      );
      
      return bookingsWithProfiles as Booking[];
    },
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          package_departures (
            *,
            group_packages (
              *,
              cities:cities!city_id (*)
            ),
            package_departure_flights (
              *,
              flights (*)
            )
          ),
          flights (*),
          hotels (
            *,
            cities (*)
          ),
          tours (
            *,
            cities (*)
          ),
          visas (*)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      // Fetch profile and agency
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user_id)
        .maybeSingle();
      
      const { data: agency } = await supabase
        .from("agencies")
        .select("*")
        .eq("user_id", data.user_id)
        .maybeSingle();
      
      return {
        ...data,
        profiles: profile,
        agencies: agency,
      } as Booking;
    },
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (booking: Omit<BookingInsert, "booking_number" | "user_id"> & { skipCreditCheck?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check agency credit limits
      if (!booking.skipCreditCheck) {
        const { data: agency } = await supabase
          .from("agencies")
          .select("id, credit_limit, used_credit, credit_limit_type, agency_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (agency) {
          const creditLimit = Number(agency.credit_limit) || 0;
          const usedCredit = Number(agency.used_credit) || 0;
          const bookingAmount = Number(booking.total_amount) || 0;
          const limitType = agency.credit_limit_type || "soft";

          // Only enforce if credit limit > 0
          if (creditLimit > 0) {
            const wouldExceed = (usedCredit + bookingAmount) > creditLimit;
            
            if (limitType === "hard" && wouldExceed) {
              throw new Error(
                `Credit limit exceeded. Available credit: $${(creditLimit - usedCredit).toFixed(2)}. ` +
                `Booking amount: $${bookingAmount.toFixed(2)}. Please contact admin to increase your credit limit.`
              );
            }

            // Update used credit
            const newUsedCredit = usedCredit + bookingAmount;
            await supabase
              .from("agencies")
              .update({ used_credit: newUsedCredit })
              .eq("id", agency.id);
          }
        }
      }

      // Generate booking number
      const bookingNumber = `GTS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

      const { data, error } = await supabase
        .from("bookings")
        .insert({
          ...booking,
          booking_number: bookingNumber,
          user_id: user.id,
        })
        .select()
        ;

      if (error) throw error;

      // Record credit transaction
      const { data: agency } = await supabase
        .from("agencies")
        .select("id, used_credit")
        .eq("user_id", user.id)
        .maybeSingle();

      if (agency) {
        await supabase
          .from("agency_credit_transactions")
          .insert({
            agency_id: agency.id,
            amount: Number(booking.total_amount),
            transaction_type: "booking",
            description: `Booking #${bookingNumber}`,
            booking_id: data.id,
            balance_after: Number(agency.used_credit) || 0,
            created_by: user.id,
          });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      queryClient.invalidateQueries({ queryKey: ["agency-credit-check"] });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: BookingUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", id)
        .select()
        ;

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
