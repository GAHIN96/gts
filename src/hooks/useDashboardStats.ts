import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  confirmedRevenue: number;
  pendingRevenue: number;
  activeAgencies: number;
  newAgenciesThisWeek: number;
  packagesCount: number;
  upcomingDeparturesCount: number;
  myBookingsCount: number;
}

interface RecentBooking {
  id: string;
  booking_number: string;
  booking_type: string;
  total_amount: number;
  passengers: number;
  status: string;
  created_at: string;
  package_name?: string;
  agency_name?: string;
}

interface UpcomingDeparture {
  id: string;
  departure_date: string;
  return_date: string;
  available_seats: number;
  total_seats: number;
  price_per_person: number;
  package_name: string;
  package_id: string;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      // Get all bookings count and revenue
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, status, total_amount");

      if (bookingsError) throw bookingsError;

      const totalBookings = bookings?.length || 0;
      const confirmedBookings = bookings?.filter(b => b.status === "confirmed")?.length || 0;
      const pendingBookings = bookings?.filter(b => 
        b.status === "pending_payment" || b.status === "payment_under_review"
      )?.length || 0;
      
      const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const confirmedRevenue = bookings
        ?.filter(b => b.status === "confirmed")
        .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const pendingRevenue = bookings
        ?.filter(b => b.status === "pending_payment" || b.status === "payment_under_review")
        .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

      // Get active agencies count
      const { count: activeAgencies } = await supabase
        .from("agencies")
        .select("id", { count: "exact", head: true })
        .eq("is_verified", true);

      // Get new agencies this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: newAgenciesThisWeek } = await supabase
        .from("agencies")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());

      // Get packages count
      const { count: packagesCount } = await supabase
        .from("group_packages")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      // Get upcoming departures count
      const today = new Date().toISOString().split("T")[0];
      const { count: upcomingDeparturesCount } = await supabase
        .from("package_departures")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .gte("departure_date", today);

      // Get my bookings count (for agency users)
      const { data: { user } } = await supabase.auth.getUser();
      let myBookingsCount = 0;
      if (user) {
        const { count } = await supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        myBookingsCount = count || 0;
      }

      return {
        totalBookings,
        confirmedBookings,
        pendingBookings,
        totalRevenue,
        confirmedRevenue,
        pendingRevenue,
        activeAgencies: activeAgencies || 0,
        newAgenciesThisWeek: newAgenciesThisWeek || 0,
        packagesCount: packagesCount || 0,
        upcomingDeparturesCount: upcomingDeparturesCount || 0,
        myBookingsCount,
      };
    },
  });
}

export function useRecentBookings(limit: number = 5) {
  return useQuery({
    queryKey: ["recent-bookings", limit],
    queryFn: async (): Promise<RecentBooking[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_number,
          booking_type,
          total_amount,
          passengers,
          status,
          created_at,
          user_id,
          package_departures (
            group_packages (
              name
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch agency names for each booking
      const bookingsWithAgency = await Promise.all(
        (data || []).map(async (booking) => {
          let agencyName = "N/A";
          try {
            const { data: agency } = await supabase
              .from("agencies")
              .select("agency_name")
              .eq("user_id", booking.user_id)
              .maybeSingle();
            
            if (agency) agencyName = agency.agency_name;
          } catch (err) {
            console.warn(`Could not fetch agency for user ${booking.user_id}:`, err);
          }

          return {
            id: booking.id,
            booking_number: booking.booking_number,
            booking_type: booking.booking_type,
            total_amount: booking.total_amount,
            passengers: booking.passengers || 1,
            status: booking.status || "draft",
            created_at: booking.created_at || "",
            package_name: (booking.package_departures as any)?.group_packages?.name,
            agency_name: agencyName,
          };
        })
      );

      return bookingsWithAgency;
    },
  });
}

export function useUpcomingDepartures(limit: number = 6) {
  return useQuery({
    queryKey: ["upcoming-departures", limit],
    queryFn: async (): Promise<UpcomingDeparture[]> => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("package_departures")
        .select(`
          id,
          departure_date,
          return_date,
          available_seats,
          total_seats,
          price_per_person,
          package_id,
          group_packages (
            name
          )
        `)
        .eq("is_active", true)
        .gte("departure_date", today)
        .order("departure_date", { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((dep) => ({
        id: dep.id,
        departure_date: dep.departure_date,
        return_date: dep.return_date,
        available_seats: dep.available_seats,
        total_seats: dep.total_seats,
        price_per_person: dep.price_per_person,
        package_id: dep.package_id,
        package_name: (dep.group_packages as any)?.name || "Unknown Package",
      }));
    },
  });
}