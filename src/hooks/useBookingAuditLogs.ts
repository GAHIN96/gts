import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BookingAuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  user_id: string | null;
  created_at: string;
  event_type: string;
  entity_name: string | null;
  description: string | null;
  user_email: string | null;
}

export function useBookingAuditLogs(bookingId: string) {
  return useQuery({
    queryKey: ["booking-audit-logs", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("table_name", "bookings")
        .eq("record_id", bookingId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as BookingAuditLog[];
    },
    enabled: !!bookingId,
  });
}

export function getChangeDescription(log: BookingAuditLog): { changeType: string; before: string; after: string; severity: "major" | "important" | "minor" } {
  const oldData = log.old_data || {};
  const newData = log.new_data || {};

  if (log.action === "create") {
    return { changeType: "Booking Created", before: "-", after: newData.booking_number || "New", severity: "minor" };
  }

  if (log.action === "delete") {
    return { changeType: "Booking Deleted", before: oldData.booking_number || "-", after: "-", severity: "major" };
  }

  // Detect specific field changes
  if (oldData.status !== newData.status) {
    const isMajor = newData.status === "canceled" || newData.status === "refunded";
    return {
      changeType: "Status Changed",
      before: (oldData.status || "draft").replace(/_/g, " "),
      after: (newData.status || "draft").replace(/_/g, " "),
      severity: isMajor ? "major" : "important",
    };
  }

  if (oldData.total_amount !== newData.total_amount) {
    return {
      changeType: "Amount Changed",
      before: `$${Number(oldData.total_amount || 0).toLocaleString()}`,
      after: `$${Number(newData.total_amount || 0).toLocaleString()}`,
      severity: "important",
    };
  }

  if (oldData.passengers !== newData.passengers) {
    return {
      changeType: "Passengers Changed",
      before: String(oldData.passengers || 1),
      after: String(newData.passengers || 1),
      severity: "important",
    };
  }

  if (oldData.notes !== newData.notes) {
    return { changeType: "Details Updated", before: "Previous", after: "Updated", severity: "minor" };
  }

  if (oldData.passenger_details !== newData.passenger_details) {
    return { changeType: "Passenger Details Updated", before: "Previous", after: "Updated", severity: "important" };
  }

  return { changeType: "Booking Updated", before: "-", after: "-", severity: "minor" };
}
