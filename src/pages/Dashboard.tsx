import { useState, useEffect } from "react";
import { 
  Package, 
  CreditCard, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Plane,
  Building,
  Eye,
  Search,
  MapPin,
  Star,
  Wallet,
  Activity,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { GroupPackageIcon } from "@/components/icons/GroupPackageIcon";
import { FlightGlobeIcon } from "@/components/icons/FlightGlobeIcon";
import { BuildGroupIcon } from "@/components/icons/BuildGroupIcon";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { usePackages } from "@/hooks/usePackages";
import { useDashboardStats, useRecentBookings, useUpcomingDepartures } from "@/hooks/useDashboardStats";
import { useDashboardSeries } from "@/hooks/useDashboardSeries";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { PendingApprovalsWidget } from "@/components/dashboard/PendingApprovalsWidget";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { cn } from "@/lib/utils";

import packageTurkey from "@/assets/package-turkey.jpg";
import destinationDubai from "@/assets/destination-dubai.jpg";
import destinationMalaysia from "@/assets/destination-malaysia.jpg";
import destinationThailand from "@/assets/destination-thailand.jpg";
import destinationEgypt from "@/assets/destination-egypt.jpg";
import heroIstanbul from "@/assets/hero-istanbul.jpg";

const heroImages = [
  { src: heroIstanbul, alt: "Istanbul", title: "Discover Istanbul", subtitle: "Where East meets West" },
  { src: destinationDubai, alt: "Dubai", title: "Experience Dubai", subtitle: "Luxury in the desert" },
  { src: destinationMalaysia, alt: "Malaysia", title: "Explore Malaysia", subtitle: "Truly Asia" },
  { src: destinationThailand, alt: "Thailand", title: "Visit Thailand", subtitle: "Land of smiles" },
];

const cityImages: Record<string, string> = {
  Istanbul: packageTurkey,
  Dubai: destinationDubai,
  "Kuala Lumpur": destinationMalaysia,
  Bangkok: destinationThailand,
  Cairo: destinationEgypt,
};

// ───────── Helpers ──────────────────────────────────────────────────────────
const Sparkline = ({
  data,
  color = "hsl(var(--primary))",
  height = 36,
  width = 120,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${points.join(" L ")}`;
  const areaPath = `${path} L ${width},${height} L 0,${height} Z`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const StatusDot = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    confirmed: "bg-success",
    pending_payment: "bg-gold",
    payment_under_review: "bg-primary",
    draft: "bg-muted-foreground/40",
    canceled: "bg-destructive",
  };
  const label: Record<string, string> = {
    confirmed: "Confirmed",
    pending_payment: "Pending",
    payment_under_review: "Reviewing",
    draft: "Draft",
    canceled: "Canceled",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80">
      <span className={cn("h-1.5 w-1.5 rounded-full", map[status] || "bg-muted-foreground/40")} />
      {label[status] || status}
    </span>
  );
};

// ───────── Admin Dashboard ─────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentBookings, isLoading: bookingsLoading } = useRecentBookings(8);
  const { data: upcomingDepartures, isLoading: departuresLoading } = useUpcomingDepartures(8);
  const { data: auditData } = useAuditLogs({}, 1, 8);
  const { data: series } = useDashboardSeries();
  const [range, setRange] = useState<"7d" | "30d" | "MTD">("30d");

  const kpis = [
    {
      label: "Total Bookings",
      value: stats?.totalBookings ?? 0,
      formatted: (stats?.totalBookings ?? 0).toLocaleString(),
      sub: `${stats?.confirmedBookings ?? 0} confirmed`,
      spark: (series?.bookingsByDay ?? []).map((d) => d.value),
      color: "hsl(var(--primary))",
      delta: null as null | number,
      route: "/bookings",
      icon: Package,
    },
    {
      label: "Pending Payments",
      value: stats?.pendingRevenue ?? 0,
      formatted: `$${(stats?.pendingRevenue ?? 0).toLocaleString()}`,
      sub: `${stats?.pendingBookings ?? 0} awaiting review`,
      spark: (series?.pendingByDay ?? []).map((d) => d.value),
      color: "hsl(var(--gold))",
      delta: null,
      route: "/finance",
      icon: CreditCard,
    },
    {
      label: "Active Agencies",
      value: stats?.activeAgencies ?? 0,
      formatted: (stats?.activeAgencies ?? 0).toLocaleString(),
      sub: `+${stats?.newAgenciesThisWeek ?? 0} this week`,
      spark: (series?.agenciesByDay ?? []).map((d) => d.value),
      color: "hsl(var(--success))",
      delta: null,
      route: "/agencies",
      icon: Users,
    },
    {
      label: "Confirmed Revenue",
      value: stats?.confirmedRevenue ?? 0,
      formatted: `$${(stats?.confirmedRevenue ?? 0).toLocaleString()}`,
      sub: `$${(stats?.totalRevenue ?? 0).toLocaleString()} total volume`,
      spark: (series?.revenueByDay ?? []).map((d) => d.value),
      color: "hsl(var(--accent))",
      delta: (() => {
        const arr = series?.revenueByDay ?? [];
        if (arr.length < 14) return null;
        const recent = arr.slice(-7).reduce((s, d) => s + d.value, 0);
        const prev = arr.slice(-14, -7).reduce((s, d) => s + d.value, 0);
        if (!prev) return null;
        return ((recent - prev) / prev) * 100;
      })(),
      route: "/finance",
      icon: TrendingUp,
    },
  ];

  const statusCounts = series?.statusCounts;
  const totalForBar = statusCounts
    ? statusCounts.confirmed +
      statusCounts.pending_payment +
      statusCounts.payment_under_review +
      statusCounts.draft +
      statusCounts.canceled
    : 0;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto tabular-nums">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Overview</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live overview of bookings, payments and agencies.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-xs font-medium">
            {(["7d", "30d", "MTD"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-colors",
                  range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/booking-calendar")} className="h-9">
            <Calendar className="h-4 w-4 mr-2" />
            {format(new Date(), "MMM yyyy")}
          </Button>
          <Button variant="navy" size="sm" onClick={() => navigate("/packages")} className="h-9">
            <Package className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>
      </header>

      {/* KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5">
                <Skeleton className="h-24 w-full" />
              </div>
            ))
          : kpis.map((k) => (
              <button
                key={k.label}
                onClick={() => navigate(k.route)}
                className="group text-left rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-[0_4px_24px_-12px_hsl(var(--primary)/0.25)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <k.icon className="h-3.5 w-3.5" />
                    {k.label}
                  </div>
                  {k.delta != null && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                        k.delta >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {k.delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(k.delta).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="text-3xl font-semibold tracking-tight text-foreground leading-none">
                    {k.formatted}
                  </div>
                  <Sparkline data={k.spark.length ? k.spark : [0, 0, 0]} color={k.color} />
                </div>
                <div className="mt-3 text-xs text-muted-foreground">{k.sub}</div>
              </button>
            ))}
      </section>

      {/* Performance strip */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue area */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Revenue · last 30 days</h3>
              <p className="text-xs text-muted-foreground">Confirmed bookings only</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold tracking-tight">
                ${(series?.revenueByDay.reduce((s, d) => s + d.value, 0) ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="h-[140px] -mx-1">
            {series && (
              <Sparkline
                data={series.revenueByDay.map((d) => d.value)}
                color="hsl(var(--primary))"
                height={140}
                width={780}
              />
            )}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Bookings by status</h3>
          <p className="text-xs text-muted-foreground mb-4">Last 30 days</p>
          {statusCounts && totalForBar > 0 ? (
            <>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                {[
                  { k: "confirmed", v: statusCounts.confirmed, c: "bg-success" },
                  { k: "payment_under_review", v: statusCounts.payment_under_review, c: "bg-primary" },
                  { k: "pending_payment", v: statusCounts.pending_payment, c: "bg-gold" },
                  { k: "draft", v: statusCounts.draft, c: "bg-muted-foreground/40" },
                  { k: "canceled", v: statusCounts.canceled, c: "bg-destructive" },
                ].map((s) => (
                  <div key={s.k} className={s.c} style={{ width: `${(s.v / totalForBar) * 100}%` }} />
                ))}
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  { k: "confirmed", label: "Confirmed", v: statusCounts.confirmed, c: "bg-success" },
                  { k: "payment_under_review", label: "Reviewing", v: statusCounts.payment_under_review, c: "bg-primary" },
                  { k: "pending_payment", label: "Pending", v: statusCounts.pending_payment, c: "bg-gold" },
                  { k: "draft", label: "Draft", v: statusCounts.draft, c: "bg-muted-foreground/40" },
                ].map((s) => (
                  <li key={s.k} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-foreground/80">
                      <span className={cn("h-2 w-2 rounded-full", s.c)} /> {s.label}
                    </span>
                    <span className="font-semibold">{s.v}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No bookings in this range yet.</p>
          )}
        </div>
      </section>

      {/* Bookings table + Pending */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <header className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent bookings</h3>
              <p className="text-xs text-muted-foreground">Latest activity across all agencies</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/bookings")} className="h-8 text-xs">
              View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </header>
          <div className="overflow-x-auto">
            {bookingsLoading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentBookings && recentBookings.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="text-left font-semibold px-5 py-2.5">Booking</th>
                    <th className="text-left font-semibold px-3 py-2.5 hidden md:table-cell">Agency</th>
                    <th className="text-right font-semibold px-3 py-2.5">Pax</th>
                    <th className="text-right font-semibold px-3 py-2.5">Amount</th>
                    <th className="text-left font-semibold px-3 py-2.5 hidden sm:table-cell">Status</th>
                    <th className="text-right font-semibold px-5 py-2.5 hidden lg:table-cell">When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => navigate("/bookings")}
                      className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="font-sans font-medium text-xs font-semibold text-foreground">{b.booking_number}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {b.package_name || b.booking_type}
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell text-foreground/80 text-xs">
                        {b.agency_name || <span className="text-muted-foreground">Direct</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-foreground/80">{b.passengers}</td>
                      <td className="px-3 py-3 text-right font-semibold text-foreground">
                        ${b.total_amount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <StatusDot status={b.status} />
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-muted-foreground hidden lg:table-cell">
                        {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-10 text-center text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No bookings yet</p>
              </div>
            )}
          </div>
        </div>

        <PendingApprovalsWidget />
      </section>

      {/* Top destinations + Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Top destinations</h3>
              <p className="text-xs text-muted-foreground">By bookings · last 30 days</p>
            </div>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
          {series && series.topDestinations.length > 0 ? (
            <ul className="space-y-3">
              {series.topDestinations.map((d, i) => {
                const max = series.topDestinations[0].count || 1;
                const pct = (d.count / max) * 100;
                return (
                  <li key={d.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-foreground/90">
                        <span className="text-[11px] font-sans font-medium text-muted-foreground w-4">{i + 1}</span>
                        {d.name}
                      </span>
                      <span className="font-semibold text-foreground">{d.count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No destination data yet.</p>
          )}
        </div>

        {/* Activity */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <header className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
                <p className="text-xs text-muted-foreground">Audit feed across the system</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/audit-logs")} className="h-8 text-xs">
              View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </header>
          <ul className="divide-y divide-border">
            {(auditData?.logs ?? []).slice(0, 8).map((log) => (
              <li key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    log.action === "create"
                      ? "bg-success"
                      : log.action === "delete"
                      ? "bg-destructive"
                      : "bg-primary"
                  )}
                />
                <div className="flex-1 min-w-0 text-sm">
                  <span className="capitalize text-foreground/90">{log.action}</span>{" "}
                  <span className="text-muted-foreground">on</span>{" "}
                  <span className="font-medium text-foreground">{log.table_name}</span>
                  {log.entity_name && (
                    <span className="text-muted-foreground"> — {log.entity_name}</span>
                  )}
                </div>
                {log.user_email && (
                  <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[180px]">
                    {log.user_email}
                  </span>
                )}
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </span>
              </li>
            ))}
            {(!auditData || auditData.logs.length === 0) && (
              <li className="p-10 text-center text-sm text-muted-foreground">No recent activity.</li>
            )}
          </ul>
        </div>
      </section>

      {/* Upcoming Departures - horizontal scroller */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Upcoming departures</h3>
            <p className="text-xs text-muted-foreground">Groups departing in the next 30 days</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/booking-calendar")} className="h-8 text-xs">
            View schedule <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </header>
        <div className="p-5">
          {departuresLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : upcomingDepartures && upcomingDepartures.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1">
              {upcomingDepartures.map((d) => {
                const sold = d.total_seats - d.available_seats;
                const pct = d.total_seats ? (sold / d.total_seats) * 100 : 0;
                return (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/packages/${d.package_id}/book`)}
                    className="snap-start text-left shrink-0 w-[280px] rounded-xl border border-border bg-background p-4 hover:border-primary/40 hover:shadow-[0_4px_18px_-10px_hsl(var(--primary)/0.3)] transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {format(new Date(d.departure_date), "dd MMM yyyy")}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                          pct >= 90
                            ? "bg-destructive/10 text-destructive"
                            : pct >= 50
                            ? "bg-gold/10 text-gold"
                            : "bg-success/10 text-success"
                        )}
                      >
                        {pct >= 90 ? "Almost full" : pct >= 50 ? "Filling" : "Open"}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground truncate mb-3">{d.package_name}</h4>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        <span className="font-semibold text-foreground">{sold}</span>/{d.total_seats} booked
                      </span>
                      <span className="font-semibold text-success">{d.available_seats} left</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No upcoming departures</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// Agency Dashboard Component - Booking Search Focused
const AgencyDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: packages, isLoading } = usePackages();
  const { data: stats } = useDashboardStats();

  // Fetch agency credit info
  const [agencyCredit, setAgencyCredit] = useState<{ credit_limit: number | null; used_credit: number | null; credit_limit_type: string | null } | null>(null);
  useEffect(() => {
    const fetchCredit = async () => {
      if (!user?.id) return;
      const { data } = await supabase.from("agencies").select("credit_limit, used_credit, credit_limit_type").eq("user_id", user.id).maybeSingle();
      if (data) setAgencyCredit(data);
    };
    fetchCredit();
  }, [user?.id]);

  // Get next departure for a package
  const getNextDeparture = (departures: any[]) => {
    if (!departures || departures.length === 0) return null;
    const upcoming = departures
      .filter((d) => d.is_active && new Date(d.departure_date) > new Date())
      .sort((a: any, b: any) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime());
    return upcoming[0] || null;
  };

  // Get upcoming departures across all packages
  const allUpcomingDepartures = packages?.flatMap((pkg) => 
    pkg.package_departures
      ?.filter((d) => d.is_active && new Date(d.departure_date) > new Date())
      .map((dep) => ({
        ...dep,
        packageName: pkg.name,
        packageId: pkg.id,
        cityName: pkg.cities?.name,
        nights: pkg.nights,
      })) || []
  ).sort((a, b) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime())
  .slice(0, 6);

  // Departures within 48 hours
  const departingSoon = allUpcomingDepartures?.filter(dep => {
    const hoursUntil = differenceInHours(new Date(dep.departure_date), new Date());
    return hoursUntil >= 0 && hoursUntil <= 48;
  }) || [];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Departing Soon Alert */}
      {departingSoon.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-gold/30 bg-gold/5 animate-fade-in">
          <div className="h-10 w-10 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-gold" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Departing Soon!</p>
            <p className="text-xs text-muted-foreground">
              {departingSoon.map(d => d.packageName).join(", ")} — departing within 48 hours
            </p>
          </div>
          <Badge className="bg-gold/15 text-gold border-gold/25 rounded-lg text-xs font-bold">{departingSoon.length}</Badge>
        </div>
      )}

      <div className="relative rounded-2xl overflow-hidden shadow-xl min-h-[420px] md:min-h-[480px]">
        <ImageCarousel
          images={heroImages}
          autoPlay={true}
          interval={6000}
          aspectRatio="wide"
          showDots={true}
          showArrows={true}
        />
        {/* Gradient Overlay - stronger for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70 pointer-events-none" />
        {/* Centered Overlay Content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center w-full max-w-2xl px-6 pointer-events-auto animate-fade-up">
            <p className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.2em] text-white/80 mb-3 drop-shadow">
              Welcome back
            </p>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg leading-tight">
              Find Your Next Trip
            </h1>
            <p className="text-white/90 mb-7 text-base md:text-lg drop-shadow-md">
              Browse and book the best travel packages for your clients
            </p>
            {/* Unified search pill */}
            <div className="flex items-center gap-2 mx-auto max-w-xl bg-white/95 dark:bg-card/95 backdrop-blur-md rounded-full p-1.5 shadow-2xl border border-white/30">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search packages, destinations..."
                  className="pl-12 h-11 bg-transparent border-0 focus-visible:ring-0 focus-visible:bg-transparent text-foreground shadow-none"
                  onFocus={() => navigate("/packages")}
                />
              </div>
              <Button
                size="lg"
                className="h-11 rounded-full px-6 shadow-md"
                onClick={() => navigate("/packages")}
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            {/* Quick destination chips */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {["Dubai", "Istanbul", "Kuala Lumpur", "Bangkok", "Cairo"].map((city) => (
                <button
                  key={city}
                  onClick={() => navigate(`/packages?city=${encodeURIComponent(city)}`)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-sm transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Browse Packages", sub: "All destinations", icon: Package, route: "/packages", tint: "bg-primary/10 text-primary" },
          { label: "Build Custom Group", sub: "Tailor a trip", icon: BuildGroupIcon, route: "/packages/build-custom-group", tint: "bg-accent/10 text-accent" },
          { label: "Book a Flight", sub: "Search routes", icon: Plane, route: "/flights/book", tint: "bg-gold/10 text-gold" },
          { label: "My Bookings", sub: "Track & manage", icon: Eye, route: "/bookings", tint: "bg-success/10 text-success" },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.route)}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-[0_4px_24px_-12px_hsl(var(--primary)/0.25)]"
          >
            <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", a.tint)}>
              <a.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{a.label}</p>
              <p className="text-xs text-muted-foreground truncate">{a.sub}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </section>

      {/* Smart Stats Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3.5 w-3.5" /> Active Bookings
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground leading-none">
            {((stats?.confirmedBookings ?? 0) + (stats?.pendingBookings ?? 0)).toLocaleString()}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {stats?.confirmedBookings ?? 0} confirmed · {stats?.pendingBookings ?? 0} pending
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" /> Pending Payments
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground leading-none">
            ${(stats?.pendingRevenue ?? 0).toLocaleString()}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">Awaiting confirmation</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> Available Credit
          </div>
          {agencyCredit && agencyCredit.credit_limit != null && agencyCredit.credit_limit > 0 ? (
            (() => {
              const used = agencyCredit.used_credit || 0;
              const limit = agencyCredit.credit_limit || 1;
              const available = Math.max(0, limit - used);
              const pct = Math.min(100, (used / limit) * 100);
              const colorClass = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-gold" : "bg-success";
              return (
                <>
                  <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground leading-none">
                    ${available.toLocaleString()}
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    ${used.toLocaleString()} used of ${limit.toLocaleString()}
                  </div>
                </>
              );
            })()
          ) : (
            <>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground leading-none">—</div>
              <div className="mt-3 text-xs text-muted-foreground">No credit limit set</div>
            </>
          )}
        </div>
      </section>


      {/* Upcoming Departures - Calendar Style */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Upcoming Departures</CardTitle>
            <CardDescription>Book seats on upcoming group departures</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/packages")}>
            View All Packages
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allUpcomingDepartures?.map((dep) => (
                <div
                  key={dep.id}
                  className="p-4 rounded-xl border border-border hover:border-primary hover:shadow-card-hover transition-all cursor-pointer group card-hover-lift"
                  onClick={() => navigate(`/packages/${dep.packageId}/book?departure=${dep.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex flex-col items-center justify-center text-primary-foreground">
                        <span className="text-lg font-bold leading-none">
                          {format(new Date(dep.departure_date), "d")}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide">
                          {format(new Date(dep.departure_date), "MMM")}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {dep.packageName}
                        </p>
                        <p className="text-sm text-muted-foreground">{dep.cityName}</p>
                        <p className="text-xs text-muted-foreground">{dep.nights} nights</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-success">{dep.available_seats}</span>
                      <span className="text-muted-foreground"> seats left</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-primary text-lg">${dep.price_per_person}</span>
                      <span className="text-muted-foreground text-xs">/person</span>
                    </div>
                  </div>
                </div>
              ))}
              {(!allUpcomingDepartures || allUpcomingDepartures.length === 0) && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming departures available</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Featured Packages */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Featured Packages</CardTitle>
            <CardDescription>Popular destinations your clients will love</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/packages")}>
            Browse All
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages?.slice(0, 3).map((pkg) => {
              const nextDep = getNextDeparture(pkg.package_departures || []);
              const cityName = pkg.cities?.name || "";
              const imageUrl = pkg.images?.[0] || cityImages[cityName] || packageTurkey;

              return (
                <div
                  key={pkg.id}
                  className="rounded-2xl overflow-hidden border border-border hover:shadow-xl transition-all cursor-pointer group"
                  onClick={() => navigate(`/packages/${pkg.id}/book`)}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={pkg.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className="bg-black/50 text-white border-none backdrop-blur-sm">
                        {pkg.nights} nights
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {pkg.name}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {cityName}, {pkg.cities?.country}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-primary">
                          ${pkg.starting_price}
                        </span>
                        <span className="text-sm text-muted-foreground">/person</span>
                      </div>
                      {nextDep && (
                        <div className="text-right text-xs text-muted-foreground">
                          <p>Next departure</p>
                          <p className="font-medium text-foreground">
                            {format(new Date(nextDep.departure_date), "dd/MM")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Dashboard - Route by Role
const Dashboard = () => {
  const { role } = useAuth();

  // Agency users see the search-focused dashboard
  if (role === "agency") {
    return <AgencyDashboard />;
  }

  // Admin and Finance see the management dashboard
  return <AdminDashboard />;
};

export default Dashboard;
