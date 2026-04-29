import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardSeries {
  revenueByDay: { date: string; value: number }[]; // last 30d, confirmed only
  bookingsByDay: { date: string; value: number }[]; // last 14d, all
  pendingByDay: { date: string; value: number }[]; // last 14d
  agenciesByDay: { date: string; value: number }[]; // last 14d (new agencies)
  statusCounts: { confirmed: number; pending_payment: number; payment_under_review: number; draft: number; canceled: number };
  topDestinations: { name: string; count: number }[];
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

const buildBuckets = (days: number) => {
  const out: { date: string; value: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push({ date: dayKey(d), value: 0 });
  }
  return out;
};

export function useDashboardSeries() {
  return useQuery({
    queryKey: ["dashboard-series"],
    queryFn: async (): Promise<DashboardSeries> => {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(
          `created_at, status, total_amount,
           package_departures ( group_packages ( name, cities ( name ) ) )`
        )
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      const revenue = buildBuckets(30);
      const bookings14 = buildBuckets(14);
      const pending14 = buildBuckets(14);
      const revIdx = new Map(revenue.map((b, i) => [b.date, i]));
      const b14Idx = new Map(bookings14.map((b, i) => [b.date, i]));

      const statusCounts = {
        confirmed: 0,
        pending_payment: 0,
        payment_under_review: 0,
        draft: 0,
        canceled: 0,
      };
      const destMap = new Map<string, number>();

      for (const b of bookings || []) {
        const k = (b.created_at || "").slice(0, 10);
        if (revIdx.has(k) && b.status === "confirmed") {
          revenue[revIdx.get(k)!].value += Number(b.total_amount) || 0;
        }
        if (b14Idx.has(k)) {
          bookings14[b14Idx.get(k)!].value += 1;
          if (b.status === "pending_payment" || b.status === "payment_under_review") {
            pending14[b14Idx.get(k)!].value += 1;
          }
        }
        const s = b.status as keyof typeof statusCounts;
        if (s in statusCounts) statusCounts[s] += 1;

        const dep: any = b.package_departures;
        const cityName = dep?.group_packages?.cities?.name;
        const pkgName = dep?.group_packages?.name;
        const key = cityName || pkgName;
        if (key) destMap.set(key, (destMap.get(key) || 0) + 1);
      }

      // New agencies last 14d
      const since14 = new Date();
      since14.setDate(since14.getDate() - 13);
      const { data: agencies } = await supabase
        .from("agencies")
        .select("created_at")
        .gte("created_at", since14.toISOString());

      const agenciesByDay = buildBuckets(14);
      const agIdx = new Map(agenciesByDay.map((b, i) => [b.date, i]));
      for (const a of agencies || []) {
        const k = (a.created_at || "").slice(0, 10);
        if (agIdx.has(k)) agenciesByDay[agIdx.get(k)!].value += 1;
      }

      const topDestinations = Array.from(destMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        revenueByDay: revenue,
        bookingsByDay: bookings14,
        pendingByDay: pending14,
        agenciesByDay,
        statusCounts,
        topDestinations,
      };
    },
    staleTime: 60_000,
  });
}
