import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HotelBookingRow {
  id: string;
  hotel_id: string | null;
  status: string;
  check_in: string | null;
  check_out: string | null;
  rooms: number;
}

/**
 * Loads all non-cancelled hotel bookings with parsed check-in/out + room count
 * from the notes JSON. Used to subtract booked rooms from open inventory so
 * pricing-tier and availability calculations reflect REAL remaining rooms.
 */
export function useHotelBookings() {
  return useQuery({
    queryKey: ["hotel-bookings-availability"],
    queryFn: async (): Promise<HotelBookingRow[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, hotel_id, status, notes")
        .eq("booking_type", "hotel")
        .not("status", "in", "(canceled,draft)");

      if (error) throw error;

      return (data || []).map((b: any) => {
        let check_in: string | null = null;
        let check_out: string | null = null;
        let rooms = 1;
        try {
          const meta = typeof b.notes === "string" ? JSON.parse(b.notes) : b.notes;
          if (meta && typeof meta === "object") {
            check_in = meta.check_in || null;
            check_out = meta.check_out || null;
            const r = Number(meta.rooms);
            rooms = Number.isFinite(r) && r > 0 ? r : (Array.isArray(meta.roomConfig) ? meta.roomConfig.length : 1);
          }
        } catch {
          // ignore malformed notes
        }
        return {
          id: b.id,
          hotel_id: b.hotel_id,
          status: b.status,
          check_in,
          check_out,
          rooms,
        };
      }).filter(b => b.hotel_id && b.check_in && b.check_out);
    },
    staleTime: 30_000,
  });
}
