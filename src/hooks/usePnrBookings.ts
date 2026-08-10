import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PnrPassenger {
  id: string;
  pnr_booking_id: string;
  title: string;
  first_name: string;
  last_name: string;
  ticket_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface PnrBookingChange {
  id: string;
  pnr_booking_id: string;
  change_type: string;
  field_name: string | null;
  before_value: string | null;
  after_value: string | null;
  description: string | null;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

export interface PnrBooking {
  id: string;
  pnr: string;
  route: string;
  flight_date: string;
  airline: string;
  ticket_type: string;
  hotel: string | null;
  status: string;
  is_modified: boolean;
  notes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  pnr_passengers?: PnrPassenger[];
  pnr_booking_changes?: PnrBookingChange[];
}

export function usePnrBookings() {
  return useQuery({
    queryKey: ["pnr-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pnr_bookings")
        .select("*, pnr_passengers(*), pnr_booking_changes(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PnrBooking[];
    },
  });
}

export function usePnrBooking(id: string) {
  return useQuery({
    queryKey: ["pnr-booking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pnr_bookings")
        .select("*, pnr_passengers(*), pnr_booking_changes(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PnrBooking;
    },
    enabled: !!id,
  });
}

export function useCreatePnrBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      pnr: string;
      route: string;
      flight_date: string;
      airline: string;
      ticket_type: string;
      hotel?: string;
      notes?: string;
      passengers: { title: string; first_name: string; last_name: string; ticket_number?: string }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: booking, error } = await supabase
        .from("pnr_bookings")
        .insert({
          pnr: input.pnr,
          route: input.route,
          flight_date: input.flight_date,
          airline: input.airline,
          ticket_type: input.ticket_type,
          hotel: input.hotel || null,
          notes: input.notes || null,
          user_id: user.id,
        })
        .select()
        ;
      if (error) throw error;

      if (input.passengers.length > 0) {
        const { error: pErr } = await supabase.from("pnr_passengers").insert(
          input.passengers.map((p) => ({
            pnr_booking_id: booking.id,
            title: p.title,
            first_name: p.first_name,
            last_name: p.last_name,
            ticket_number: p.ticket_number || null,
          }))
        );
        if (pErr) throw pErr;
      }

      // Log creation
      const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id);
      await supabase.from("pnr_booking_changes").insert({
        pnr_booking_id: booking.id,
        change_type: "Booking Created",
        description: `Booking created with PNR ${input.pnr} and ${input.passengers.length} passenger(s)`,
        user_id: user.id,
        user_email: profile?.email || user.email,
      });

      return booking;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pnr-bookings"] }),
  });
}

export function useUpdatePnrBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, changes, ...updates }: {
      id: string;
      pnr?: string;
      route?: string;
      flight_date?: string;
      airline?: string;
      ticket_type?: string;
      hotel?: string | null;
      notes?: string | null;
      status?: string;
      changes?: { change_type: string; field_name?: string; before_value?: string; after_value?: string; description?: string }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("pnr_bookings")
        .update({ ...updates, is_modified: true })
        .eq("id", id)
        .select()
        ;
      if (error) throw error;

      if (changes && changes.length > 0 && user) {
        const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id);
        await supabase.from("pnr_booking_changes").insert(
          changes.map((c) => ({
            pnr_booking_id: id,
            change_type: c.change_type,
            field_name: c.field_name || null,
            before_value: c.before_value || null,
            after_value: c.after_value || null,
            description: c.description || null,
            user_id: user.id,
            user_email: profile?.email || user.email,
          }))
        );
      }
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pnr-bookings"] });
      qc.invalidateQueries({ queryKey: ["pnr-booking"] });
    },
  });
}

export function useDeletePnrBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pnr_bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pnr-bookings"] }),
  });
}

export function useAddPnrPassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      pnr_booking_id: string;
      title: string;
      first_name: string;
      last_name: string;
      ticket_number?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("pnr_passengers").insert({
        pnr_booking_id: input.pnr_booking_id,
        title: input.title,
        first_name: input.first_name,
        last_name: input.last_name,
        ticket_number: input.ticket_number || null,
      }).select();
      if (error) throw error;

      // Mark booking as modified & log change
      await supabase.from("pnr_bookings").update({ is_modified: true }).eq("id", input.pnr_booking_id);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id);
        await supabase.from("pnr_booking_changes").insert({
          pnr_booking_id: input.pnr_booking_id,
          change_type: "Passenger Added",
          after_value: `${input.title} ${input.first_name} ${input.last_name}`,
          description: `Passenger ${input.title} ${input.first_name} ${input.last_name} added`,
          user_id: user.id,
          user_email: profile?.email || user.email,
        });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pnr-bookings"] });
      qc.invalidateQueries({ queryKey: ["pnr-booking"] });
    },
  });
}

export function useRemovePnrPassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bookingId, name }: { id: string; bookingId: string; name: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("pnr_passengers").delete().eq("id", id);
      if (error) throw error;

      await supabase.from("pnr_bookings").update({ is_modified: true }).eq("id", bookingId);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id);
        await supabase.from("pnr_booking_changes").insert({
          pnr_booking_id: bookingId,
          change_type: "Passenger Removed",
          before_value: name,
          description: `Passenger ${name} removed`,
          user_id: user.id,
          user_email: profile?.email || user.email,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pnr-bookings"] });
      qc.invalidateQueries({ queryKey: ["pnr-booking"] });
    },
  });
}
