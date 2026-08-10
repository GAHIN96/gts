import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SeatBlockValidation {
  hasBlock: boolean;
  blockedSeats: number;
  usedSeats: number;
  remainingSeats: number;
  isLoading: boolean;
}

export function useAgencySeatBlockValidation(flightId: string | null): SeatBlockValidation {
  const { user } = useAuth();

  // Get agency ID for the current user
  const { data: agency } = useQuery({
    queryKey: ["my-agency", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  // Get seat blocks for this agency on this flight
  const { data: seatBlock, isLoading: blockLoading } = useQuery({
    queryKey: ["agency-seat-block", flightId, agency?.id],
    enabled: !!flightId && !!agency?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_seat_blocks")
        .select("blocked_seats")
        .eq("flight_id", flightId!)
        .eq("agency_id", agency!.id)
        .eq("is_active", true);
      if (error) throw error;
      const total = (data as any[]).reduce((sum: number, b: any) => sum + b.blocked_seats, 0);
      return total as number;
    },
  });

  // Count how many seats this agency has already booked on this flight
  const { data: usedSeats, isLoading: usedLoading } = useQuery({
    queryKey: ["agency-used-seats", flightId, user?.id],
    enabled: !!flightId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("passengers")
        .eq("flight_id", flightId!)
        .eq("user_id", user!.id)
        .not("status", "in", '("canceled","refunded")');
      if (error) throw error;
      return (data || []).reduce((sum, b) => sum + (b.passengers || 1), 0);
    },
  });

  const blockedSeats = seatBlock || 0;
  const used = usedSeats || 0;
  const hasBlock = blockedSeats > 0;

  return {
    hasBlock,
    blockedSeats,
    usedSeats: used,
    remainingSeats: Math.max(0, blockedSeats - used),
    isLoading: blockLoading || usedLoading,
  };
}
