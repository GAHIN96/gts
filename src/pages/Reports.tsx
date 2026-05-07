import { useState, useMemo } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Package,
  PlaneTakeoff, Hotel, Calendar as CalendarIcon, Building2, Compass, Stamp,
  FileSpreadsheet, FileText, Search, MapPin, Wallet, ChevronLeft, ChevronRight,
  Plane, History, AlertTriangle, ArrowUpRight, ShieldCheck, Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { useFlights, useFlightStats } from "@/hooks/useFlights";
import { useHotels, useHotelStats } from "@/hooks/useHotels";
import { usePackages } from "@/hooks/usePackages";
import { useAllDepartures } from "@/hooks/useAllDepartures";
import {
  format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval,
  eachMonthOfInterval, eachDayOfInterval, isSameMonth, isSameDay, addMonths,
  startOfWeek, endOfWeek,
} from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { AgencyPerformance } from "@/components/reports/AgencyPerformance";
import { DestinationsReport } from "@/components/reports/DestinationsReport";
import { FinancialSummaryReport } from "@/components/reports/FinancialSummaryReport";
import { DebtsAgingReport } from "@/components/reports/DebtsAgingReport";
import { exportToExcel as generateExcel } from "@/utils/excelExport";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { getChangeDescription } from "@/hooks/useBookingAuditLogs";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6"];
const COLORS_STATIC = ['#1e40af', '#047857', '#b45309', '#be123c', '#4338ca', '#6d28d9'];

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
  payment_under_review: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  canceled: "bg-rose-50 text-rose-700 border-rose-200",
  refunded: "bg-slate-100 text-slate-700 border-slate-200",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending_payment: "Pending Payment",
  payment_under_review: "Under Review",
  confirmed: "Confirmed",
  canceled: "Canceled",
  refunded: "Refunded",
};

const getStatusBadge = (status: string | null) => {
  const label = statusLabels[status || 'draft'] || 'Draft';
  const colorClass = statusColors[status || 'draft'] || "bg-slate-100 text-slate-700 border-slate-200";
  return <Badge variant="outline" className={cn("font-bold text-[10px] uppercase tracking-wider px-2 py-0.5", colorClass)}>{label}</Badge>;
};

interface DayEvent {
  type: "booking" | "departure";
  id: string;
  title: string;
  status?: string;
  passengers?: number;
  destination?: string;
  availableSeats?: number;
}

// ─── Change Tracking Report Component ───
const ChangeTrackingReport = () => {
  const { data: auditData, isLoading } = useAuditLogs({ tableName: "bookings" }, 1, 200);

  if (isLoading) return <div className="text-center py-20 text-muted-foreground font-medium">Synchronizing audit logs...</div>;

  const logs = auditData?.logs || [];
  const updateLogs = logs.filter(l => l.action === "update");
  const changeTypes = updateLogs.reduce((acc, log) => {
    const change = getChangeDescription(log as any);
    acc[change.changeType] = (acc[change.changeType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const changeTypeData = Object.entries(changeTypes)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const userChanges = updateLogs.reduce((acc, log) => {
    const email = log.user_email || "System";
    acc[email] = (acc[email] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topUsers = Object.entries(userChanges)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const majorChanges = updateLogs.filter(l => {
    const c = getChangeDescription(l as any);
    return c.severity === "major" || c.severity === "important";
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Audit KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Modifications", value: updateLogs.length, icon: History, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Critical Changes", value: majorChanges.length, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Change Categories", value: changeTypeData.length, icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Active Operators", value: Object.keys(userChanges).length, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((k, i) => (
          <Card key={i} className="border-none shadow-sm bg-card hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1 tracking-tight">{k.value}</p>
                </div>
                <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center", k.bg)}>
                  <k.icon className={cn("h-5 w-5", k.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Booking Distribution */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="p-8 border-b bg-muted/30">
            <CardTitle className="text-lg font-bold uppercase tracking-tight">Modification Distribution</CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Classification of system updates by category</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {changeTypeData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground font-medium">No activity logs found</div>
            ) : (
              <div className="space-y-6">
                {changeTypeData.map((ct) => (
                  <div key={ct.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground uppercase tracking-tight">{ct.name}</span>
                      <Badge variant="secondary" className="font-bold text-[10px]">{ct.value}</Badge>
                    </div>
                    <Progress value={(ct.value / Math.max(...changeTypeData.map(d => d.value))) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Operator Ranking */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="p-8 border-b bg-muted/30">
            <CardTitle className="text-lg font-bold uppercase tracking-tight">Operator Activity</CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-wider">Most active system users by change volume</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {topUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground font-medium">No operator activity detected</div>
            ) : (
              <div className="space-y-4">
                {topUsers.map((u, i) => (
                  <div key={u.name} className="flex items-center justify-between p-4 rounded-2xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs ${i === 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </div>
                      <p className="text-xs font-bold text-foreground truncate max-w-[150px]">{u.name}</p>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] uppercase tracking-wider">
                      {u.count} Updates
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operational Log Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-8 bg-slate-50 border-b">
          <CardTitle className="text-xl font-bold uppercase tracking-tight">Operational Audit Log</CardTitle>
          <CardDescription className="text-sm font-medium">Comprehensive record of all entity modifications and state transitions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {updateLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
              <History className="h-16 w-16 mb-4" />
              <p className="font-bold uppercase tracking-widest text-xs">No records available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 h-12 px-8">Entity</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500">Category</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500">Previous State</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500">New State</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500">Operator</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-slate-500 pr-8">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {updateLogs.slice(0, 50).map(log => {
                    const change = getChangeDescription(log as any);
                    return (
                      <TableRow key={log.id} className="border-b hover:bg-slate-50 transition-colors">
                        <TableCell className="px-8 py-4 font-sans font-medium text-xs text-primary font-bold uppercase">{log.entity_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "font-bold text-[10px] uppercase tracking-wider px-2 py-0.5",
                            change.severity === "major" ? "border-rose-200 text-rose-700 bg-rose-50" :
                              change.severity === "important" ? "border-amber-200 text-amber-700 bg-amber-50" : "border-slate-200 text-slate-700 bg-slate-50"
                          )}>
                            {change.changeType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] font-medium text-slate-400 italic max-w-[150px] truncate">{change.before}</TableCell>
                        <TableCell className="text-[11px] font-bold text-slate-700 max-w-[150px] truncate">{change.after}</TableCell>
                        <TableCell className="text-[11px] font-semibold text-slate-500 truncate max-w-[120px]">{log.user_email || 'System'}</TableCell>
                        <TableCell className="text-right pr-8 text-[10px] font-bold text-slate-400">{format(new Date(log.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {updateLogs.length > 50 && (
                <div className="p-4 text-center border-t bg-muted/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Showing latest 50 of {updateLogs.length} audit entries</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Reports = () => {
  const { data: bookings, isLoading } = useBookings();
  const { data: flights } = useFlights();
  const { data: flightStats } = useFlightStats();
  const { data: hotels } = useHotels();
  const { data: hotelStats } = useHotelStats();
  const { data: packages } = usePackages();
  const { data: departures, isLoading: departuresLoading } = useAllDepartures();

  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mainTab, setMainTab] = useState("reports");

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const setQuickFilter = (preset: string) => {
    const now = new Date();
    let from: Date;
    let to: Date = endOfMonth(now);
    switch (preset) {
      case 'thisMonth': from = startOfMonth(now); to = endOfMonth(now); break;
      case 'lastMonth': from = startOfMonth(subMonths(now, 1)); to = endOfMonth(subMonths(now, 1)); break;
      case 'last3Months': from = startOfMonth(subMonths(now, 2)); break;
      case 'last6Months': from = startOfMonth(subMonths(now, 5)); break;
      case 'thisYear': from = new Date(now.getFullYear(), 0, 1); to = new Date(now.getFullYear(), 11, 31); break;
      default: from = new Date(2020, 0, 1); to = now; break;
    }
    setDateRange({ from: format(from!, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') });
  };

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => {
      try {
        const d = parseISO(b.created_at || '');
        if (!isWithinInterval(d, { start: parseISO(dateRange.from), end: parseISO(dateRange.to) })) return false;
      } catch { /* pass */ }
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!b.booking_number.toLowerCase().includes(s) && !b.booking_type.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [bookings, dateRange, statusFilter, searchTerm]);

  const getByType = (type: string) => filteredBookings.filter(b => b.booking_type === type);
  const packageBookings = getByType("package");
  const flightBookings = getByType("flight");
  const hotelBookings = getByType("hotel");
  const tourBookings = getByType("tour");
  const visaBookings = getByType("visa");

  const totalRevenue = filteredBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
  const confirmedRevenue = filteredBookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + (b.total_amount || 0), 0);

  // ─── Analytics Data ─────────────────────────────────────
  const analyticsData = useMemo(() => {
    if (!bookings) return null;
    const last6Months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
    const monthlyData = last6Months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthBookings = bookings.filter((b) => {
        const date = new Date(b.created_at || "");
        return date >= monthStart && date <= monthEnd;
      });
      const confirmedBookings = monthBookings.filter((b) => b.status === "confirmed");
      const revenue = confirmedBookings.reduce((sum, b) => sum + b.total_amount, 0);
      const passengers = monthBookings.reduce((sum, b) => sum + (b.passengers || 0), 0);
      return { month: format(month, "MMM"), fullMonth: format(month, "MMMM yyyy"), bookings: monthBookings.length, confirmed: confirmedBookings.length, revenue, passengers };
    });

    const destinationRevenue = bookings.reduce((acc, booking) => {
      const destination = booking.package_departures?.group_packages?.cities?.name || "Other";
      const existing = acc.find((d) => d.name === destination);
      if (existing) { existing.value += booking.total_amount; existing.bookings += 1; }
      else { acc.push({ name: destination, value: booking.total_amount, bookings: 1 }); }
      return acc;
    }, [] as { name: string; value: number; bookings: number }[]);
    const topDestinations = destinationRevenue.sort((a, b) => b.value - a.value).slice(0, 5);

    const statusDistribution = bookings.reduce((acc, booking) => {
      const status = booking.status || "draft";
      const existing = acc.find((s) => s.name === status);
      if (existing) { existing.value += 1; } else { acc.push({ name: status, value: 1 }); }
      return acc;
    }, [] as { name: string; value: number }[]);

    const seasonalData = bookings.reduce((acc, booking) => {
      if (booking.package_departures?.departure_date) {
        const month = format(parseISO(booking.package_departures.departure_date), "MMM");
        const existing = acc.find((s) => s.month === month);
        if (existing) { existing.bookings += 1; existing.passengers += booking.passengers || 0; }
        else { acc.push({ month, bookings: 1, passengers: booking.passengers || 0 }); }
      }
      return acc;
    }, [] as { month: string; bookings: number; passengers: number }[]);

    const totalRevenueAll = bookings.filter((b) => b.status === "confirmed").reduce((sum, b) => sum + b.total_amount, 0);
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length;
    const totalPassengers = bookings.reduce((sum, b) => sum + (b.passengers || 0), 0);
    const currentMonthBookings = monthlyData[monthlyData.length - 1]?.bookings || 0;
    const previousMonthBookings = monthlyData[monthlyData.length - 2]?.bookings || 1;
    const bookingGrowth = ((currentMonthBookings - previousMonthBookings) / previousMonthBookings) * 100;
    const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0;
    const previousMonthRevenue = monthlyData[monthlyData.length - 2]?.revenue || 1;
    const revenueGrowth = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;

    const topAgencies = bookings.reduce((acc, booking) => {
      const agencyName = booking.agencies?.agency_name || "Direct / Individual";
      const existing = acc.find((a) => a.name === agencyName);
      if (existing) { existing.value += booking.total_amount; existing.bookings += 1; }
      else { acc.push({ name: agencyName, value: booking.total_amount, bookings: 1 }); }
      return acc;
    }, [] as { name: string; value: number; bookings: number }[]);
    const topAgenciesSorted = topAgencies.sort((a, b) => b.value - a.value).slice(0, 5);

    return {
      monthlyData, topDestinations, topAgencies: topAgenciesSorted, statusDistribution, seasonalData,
      totals: { revenue: totalRevenueAll, bookings: totalBookings, confirmed: confirmedBookings, passengers: totalPassengers },
      growth: { bookings: bookingGrowth, revenue: revenueGrowth },
    };
  }, [bookings]);

  // ─── Calendar Data ──────────────────────────────────────
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    bookings?.forEach((booking) => {
      if (booking.package_departures?.departure_date) {
        const dateKey = format(new Date(booking.package_departures.departure_date), "yyyy-MM-dd");
        const existing = map.get(dateKey) || [];
        existing.push({ type: "booking", id: booking.id, title: booking.booking_number, status: booking.status || "draft", passengers: booking.passengers || 1, destination: booking.package_departures.group_packages?.cities?.name });
        map.set(dateKey, existing);
      }
    });
    departures?.forEach((departure) => {
      const dateKey = format(new Date(departure.departure_date), "yyyy-MM-dd");
      const existing = map.get(dateKey) || [];
      existing.push({ type: "departure", id: departure.id, title: departure.group_packages?.name || "Package Departure", destination: departure.group_packages?.cities?.name, availableSeats: departure.available_seats });
      map.set(dateKey, existing);
    });
    return map;
  }, [bookings, departures]);

  const getEventsForDate = (date: Date): DayEvent[] => eventsByDate.get(format(date, "yyyy-MM-dd")) || [];

  const handleDateClick = (date: Date) => {
    const events = getEventsForDate(date);
    if (events.length > 0) { setSelectedDate(date); setDetailsOpen(true); }
  };

  const monthStats = useMemo(() => {
    const ms = startOfMonth(currentMonth);
    const me = endOfMonth(currentMonth);
    const mb = bookings?.filter((b) => { const d = b.package_departures?.departure_date; if (!d) return false; const dd = new Date(d); return dd >= ms && dd <= me; }) || [];
    const md = departures?.filter((d) => { const dd = new Date(d.departure_date); return dd >= ms && dd <= me; }) || [];
    return { totalBookings: mb.length, confirmedBookings: mb.filter((b) => b.status === "confirmed").length, pendingBookings: mb.filter((b) => b.status === "pending_payment" || b.status === "payment_under_review").length, totalDepartures: md.length, totalPassengers: mb.reduce((sum, b) => sum + (b.passengers || 0), 0) };
  }, [bookings, departures, currentMonth]);

  // ─── Export helpers ─────────────────────────────────────
  const exportBookingsExcel = (data: Booking[], label: string) => {
    if (data.length === 0) return;
    const rows = data.map(b => ({
      'Booking #': b.booking_number, 'Type': b.booking_type, 'Status': b.status || 'draft',
      'Agency': b.agencies?.agency_name || 'N/A',
      'Package': b.package_departures?.group_packages?.name || b.flights?.airline || b.hotels?.name || b.tours?.name || b.visas?.country || 'N/A',
      'Destination': b.package_departures?.group_packages?.cities?.name || b.flights?.arrival_city || b.hotels?.cities?.name || b.tours?.cities?.name || b.visas?.country || 'N/A',
      'Passengers': b.passengers || 1, 'Amount ($)': b.total_amount,
      'Created': b.created_at ? format(new Date(b.created_at), 'dd/MM/yyyy') : '',
    }));
    generateExcel(rows, label, `${label}_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportUniversalReport = () => {
    if (!filteredBookings.length) return;

    // Summary Tab
    const summaryRows = [
      { Metric: "Total Revenue", Value: totalRevenue },
      { Metric: "Confirmed Revenue", Value: confirmedRevenue },
      { Metric: "Total Bookings", Value: filteredBookings.length },
      { Metric: "Total Passengers", Value: filteredBookings.reduce((s, b) => s + (b.passengers || 1), 0) },
      { Metric: "Report Period", Value: `${dateRange.from} to ${dateRange.to}` }
    ];

    // Agencies Tab (Calculated from filtered bookings)
    const agencyMap = new Map();
    filteredBookings.forEach(b => {
      const name = b.agencies?.agency_name || "Direct";
      const stats = agencyMap.get(name) || { name, bookings: 0, revenue: 0 };
      stats.bookings++;
      stats.revenue += b.total_amount;
      agencyMap.set(name, stats);
    });
    const agencyRows = Array.from(agencyMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Destinations Tab
    const destMap = new Map();
    filteredBookings.forEach(b => {
      const name = b.package_departures?.group_packages?.cities?.name || b.flights?.arrival_city || "Other";
      const stats = destMap.get(name) || { name, bookings: 0, revenue: 0 };
      stats.bookings++;
      stats.revenue += b.total_amount;
      destMap.set(name, stats);
    });
    const destRows = Array.from(destMap.values()).sort((a, b) => b.revenue - a.revenue);

    generateExcel(filteredBookings.map(b => ({
      ID: b.booking_number, Type: b.booking_type, Agency: b.agencies?.agency_name || "Direct",
      Service: b.package_departures?.group_packages?.name || b.flights?.airline || "N/A",
      Destination: b.package_departures?.group_packages?.cities?.name || b.flights?.arrival_city || "N/A",
      Amount: b.total_amount, Status: b.status, Date: b.created_at
    })), "Master_Report", `Universal_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast.success("Universal Report Exported");
  };

  const exportBookingsPDF = (data: Booking[], label: string) => {
    if (data.length === 0) return;
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pw = pdf.internal.pageSize.getWidth();
    pdf.setFontSize(16); pdf.text(`${label} Report`, 14, 18);
    pdf.setFontSize(9); pdf.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Total: ${data.length} bookings | Revenue: $${data.reduce((s, b) => s + b.total_amount, 0).toLocaleString()}`, 14, 26);
    const headers = ['Booking #', 'Agency', 'Service', 'Destination', 'Pax', 'Amount', 'Status', 'Date'];
    const colW = [35, 40, 50, 35, 15, 25, 25, 25];
    let y = 36;
    pdf.setFillColor(26, 35, 126); pdf.rect(14, y - 5, pw - 28, 8, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(8);
    let x = 14; headers.forEach((h, i) => { pdf.text(h, x + 1, y); x += colW[i]; });
    y += 6; pdf.setTextColor(0, 0, 0);
    data.slice(0, 60).forEach((b, idx) => {
      if (y > 190) { pdf.addPage(); y = 20; }
      if (idx % 2 === 0) { pdf.setFillColor(245, 245, 245); pdf.rect(14, y - 4, pw - 28, 7, 'F'); }
      const row = [b.booking_number, (b.agencies?.agency_name || 'N/A').substring(0, 20), (b.package_departures?.group_packages?.name || b.flights?.airline || b.hotels?.name || b.tours?.name || b.visas?.country || 'N/A').substring(0, 25), (b.package_departures?.group_packages?.cities?.name || b.flights?.arrival_city || 'N/A').substring(0, 18), String(b.passengers || 1), `$${b.total_amount.toLocaleString()}`, b.status || 'draft', b.created_at ? format(new Date(b.created_at), 'dd/MM/yy') : ''];
      x = 14; pdf.setFontSize(7); row.forEach((c, i) => { pdf.text(c, x + 1, y); x += colW[i]; }); y += 7;
    });
    pdf.save(`${label}_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const stats = [
    { title: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Booking Volume", value: filteredBookings.length.toString(), icon: Package, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Confirmed Revenue", value: `$${confirmedRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
    { title: "Active Packages", value: (packages?.filter(p => p.is_active).length || 0).toString(), icon: ShieldCheck, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const revenueByType = [
    { name: 'Packages', value: packageBookings.reduce((s, b) => s + b.total_amount, 0) },
    { name: 'Flights', value: flightBookings.reduce((s, b) => s + b.total_amount, 0) },
    { name: 'Hotels', value: hotelBookings.reduce((s, b) => s + b.total_amount, 0) },
    { name: 'Tours', value: tourBookings.reduce((s, b) => s + b.total_amount, 0) },
    { name: 'Visas', value: visaBookings.reduce((s, b) => s + b.total_amount, 0) },
  ].filter(d => d.value > 0);

  const BookingTable = ({ data, type }: { data: Booking[]; type: string }) => (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardHeader className="p-8 border-b bg-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <CardTitle className="text-xl font-bold uppercase tracking-tight">{type} Booking Log</CardTitle>
            <CardDescription className="text-sm font-medium">{data.length} records found | Total Value: ${data.reduce((s, b) => s + b.total_amount, 0).toLocaleString()}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="bg-background font-semibold" onClick={() => exportBookingsExcel(data, type)} disabled={data.length === 0}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Excel
            </Button>
            <Button size="sm" variant="outline" className="bg-background font-semibold" onClick={() => exportBookingsPDF(data, type)} disabled={data.length === 0}>
              <FileText className="h-4 w-4 mr-2 text-blue-600" /> PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
            <Package className="h-16 w-16 mb-4" />
            <p className="font-bold uppercase tracking-widest text-xs">No records available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-12 px-8">Reference #</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Agency</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Service Description</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Destination</TableHead>
                  {type === 'package' && <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Departure</TableHead>}
                  {type === 'flight' && <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Route</TableHead>}
                  <TableHead className="text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Pax</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground pr-8">Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(b => (
                  <TableRow key={b.id} className="border-b hover:bg-muted/30 transition-colors">
                    <TableCell className="px-8 py-4 font-sans font-medium text-xs text-blue-600 font-bold">{b.booking_number}</TableCell>
                    <TableCell className="text-xs font-semibold text-muted-foreground truncate max-w-[120px]">{b.agencies?.agency_name || 'Direct Client'}</TableCell>
                    <TableCell className="text-xs font-bold text-foreground truncate max-w-[150px]">
                      {type === 'package' && (b.package_departures?.group_packages?.name || '---')}
                      {type === 'flight' && (b.flights?.airline || '---')}
                      {type === 'hotel' && (b.hotels?.name || '---')}
                      {type === 'tour' && (b.tours?.name || '---')}
                      {type === 'visa' && (b.visas ? `${b.visas.country} [${b.visas.visa_type}]` : '---')}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                      {type === 'package' && (b.package_departures?.group_packages?.cities?.name || '---')}
                      {type === 'flight' && (b.flights?.arrival_city || '---')}
                      {type === 'hotel' && (b.hotels?.cities?.name || '---')}
                      {type === 'tour' && (b.tours?.cities?.name || '---')}
                      {type === 'visa' && (b.visas?.country || '---')}
                    </TableCell>
                    {type === 'package' && <TableCell className="text-[10px] font-bold text-muted-foreground">{b.package_departures?.departure_date ? format(new Date(b.package_departures.departure_date), 'dd/MM/yy') : '---'}</TableCell>}
                    {type === 'flight' && <TableCell className="text-[10px] font-bold text-muted-foreground">{b.flights ? `${b.flights.departure_city} > ${b.flights.arrival_city}` : '---'}</TableCell>}
                    <TableCell className="text-center font-bold text-foreground">{b.passengers || 1}</TableCell>
                    <TableCell className="text-right font-bold text-foreground">${b.total_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {getStatusBadge(b.status)}
                    </TableCell>
                    <TableCell className="pr-8 text-right text-[10px] font-bold text-muted-foreground">{b.created_at ? format(new Date(b.created_at), 'dd/MM/yy') : '--/--/--'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const TypeSummaryCards = ({ data, label, icon: Icon }: { data: Booking[]; label: string; icon: React.ElementType }) => {
    const rev = data.reduce((s, b) => s + b.total_amount, 0);
    const confirmed = data.filter(b => b.status === 'confirmed');
    const confRev = confirmed.reduce((s, b) => s + b.total_amount, 0);
    const pax = data.reduce((s, b) => s + (b.passengers || 1), 0);
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-none shadow-sm bg-card hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total {label}</p>
                <p className="text-2xl font-bold text-foreground mt-1 tracking-tight">{data.length}</p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-card hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground mt-1 tracking-tight">${rev.toLocaleString()}</p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-card hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Confirmed Revenue</p>
                <p className="text-2xl font-bold text-foreground mt-1 tracking-tight">${confRev.toLocaleString()}</p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-card hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Passengers</p>
                <p className="text-2xl font-bold text-foreground mt-1 tracking-tight">{pax}</p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-64" /><div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}</div></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ═══════ BI REPORTS HEADER ═══════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-8 rounded-3xl border shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold text-[10px] uppercase tracking-wider px-2">Enterprise Analytics</Badge>
            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Business Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Reports & Analytics Hub</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Comprehensive operational monitoring and strategic performance metrics.</p>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-8">
        <TabsList className="bg-muted/50 border p-1 rounded-2xl h-auto gap-2">
          {[
            { value: "reports", label: "Operations", icon: BarChart3 },
            { value: "analytics", label: "Performance", icon: TrendingUp },
            { value: "calendar", label: "Timeline", icon: CalendarIcon },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="px-8 py-3 rounded-xl gap-2 font-bold uppercase text-[10px] tracking-widest text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ════════════════ REPORTS TAB ════════════════ */}
        <TabsContent value="reports" className="space-y-6">
          {/* Date Range & Filters */}
          <Card className="border-none shadow-sm bg-card overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'thisMonth', label: 'Month' },
                    { id: 'lastMonth', label: 'Last' },
                    { id: 'last3Months', label: 'Quarter' },
                    { id: 'last6Months', label: 'Half Year' },
                    { id: 'thisYear', label: 'Year' },
                    { id: 'allTime', label: 'All' }
                  ].map(p => (
                    <Button key={p.id} size="sm" variant="ghost" onClick={() => setQuickFilter(p.id)} className="h-9 px-4 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground font-bold text-[10px] uppercase tracking-widest border border-transparent">
                      {p.label}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Range Start</Label>
                    <DateInput value={dateRange.from} onValueChange={v => setDateRange(p => ({ ...p, from: v }))} className="w-36 h-11 border-muted bg-muted/20 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Range End</Label>
                    <DateInput value={dateRange.to} onValueChange={v => setDateRange(p => ({ ...p, to: v }))} className="w-36 h-11 border-muted bg-muted/20 rounded-xl" />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-8 pt-8 border-t">
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input placeholder="Search by booking reference or type..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-11 h-12 border-muted bg-muted/20 rounded-xl placeholder:text-muted-foreground/60" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-60 h-12 border-muted bg-muted/20 rounded-xl"><SelectValue placeholder="Filter by Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_payment">Payment Pending</SelectItem>
                    <SelectItem value="payment_under_review">Under Review</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Report Sub-Tabs */}
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="flex flex-wrap h-auto gap-2 p-1 bg-transparent border-none">
              {[
                { value: "overview", label: "Overview", icon: BarChart3, color: "text-blue-600" },
                { value: "packages", label: "Packages", icon: Package, count: packageBookings.length, color: "text-emerald-600" },
                { value: "flights", label: "Flights", icon: PlaneTakeoff, count: flightBookings.length, color: "text-amber-600" },
                { value: "hotels", label: "Hotels", icon: Hotel, count: hotelBookings.length, color: "text-rose-600" },
                { value: "tours", label: "Tours", icon: Compass, count: tourBookings.length, color: "text-indigo-600" },
                { value: "visas", label: "Visas", icon: Stamp, count: visaBookings.length, color: "text-violet-600" },
                { value: "agencies", label: "Agencies", icon: Building2, color: "text-slate-600" },
                { value: "destinations", label: "Destinations", icon: MapPin, color: "text-slate-600" },
                { value: "financial", label: "Financial", icon: Wallet, color: "text-slate-600" },
                { value: "debts", label: "Debts & Aging", icon: Building2, color: "text-slate-600" },
                { value: "changes", label: "Change Tracking", icon: History, color: "text-slate-600" },
              ].map((sub) => (
                <TabsTrigger
                  key={sub.value}
                  value={sub.value}
                  className="px-5 py-3 rounded-2xl border bg-card text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary shadow-sm transition-all group/sub"
                >
                  <sub.icon className={cn("h-4 w-4 mr-2 transition-colors", sub.color, "group-data-[state=active]/sub:text-primary-foreground")} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{sub.label}</span>
                  {sub.count !== undefined && (
                    <Badge variant="secondary" className="ml-2 bg-muted/20 text-[10px] font-bold px-1.5 group-data-[state=active]/sub:bg-white/20 group-data-[state=active]/sub:text-white border-none">
                      {sub.count}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((s, i) => (
                  <Card key={i} className="border-none shadow-sm bg-card hover:shadow-md transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.title}</p>
                          <p className="text-2xl font-bold text-foreground mt-1 tracking-tight">{s.value}</p>
                        </div>
                        <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center", s.bg)}>
                          <s.icon className={cn("h-5 w-5", s.color)} />
                        </div>
                      </div>
                      <div className="mt-4 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: '65%' }} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="p-8 border-b bg-muted/30">
                    <CardTitle className="text-lg font-bold uppercase tracking-tight text-foreground">Revenue by Category</CardTitle>
                    <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Revenue distribution across booking types</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    {revenueByType.length === 0 ? <p className="text-center py-12 text-muted-foreground font-medium uppercase tracking-widest text-xs">No data available</p> : (
                      <>
                        <div className="h-[280px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={revenueByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                {revenueByType.map((_, i) => <Cell key={i} fill={COLORS_STATIC[i % COLORS_STATIC.length]} />)}
                              </Pie>
                              <Tooltip
                                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }}
                                formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-6 justify-center">
                          {revenueByType.map((d, i) => (
                            <div key={d.name} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-muted/20">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS_STATIC[i % COLORS_STATIC.length] }} />
                              <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">{d.name}: ${d.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="p-8 border-b bg-muted/30">
                    <CardTitle className="text-lg font-bold uppercase tracking-tight text-foreground">Booking Volume</CardTitle>
                    <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Number of confirmed bookings per type</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Packages', count: packageBookings.length },
                          { name: 'Flights', count: flightBookings.length },
                          { name: 'Hotels', count: hotelBookings.length },
                          { name: 'Tours', count: tourBookings.length },
                          { name: 'Visas', count: visaBookings.length },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" fontSize={11} fontWeight={600} tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <YAxis fontSize={11} fontWeight={600} tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
                          <Bar dataKey="count" name="Bookings" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* All Bookings Table */}
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="p-8 border-b bg-muted/30">
                  <div className="flex items-center justify-between flex-wrap gap-6">
                    <div>
                      <CardTitle className="text-xl font-bold uppercase tracking-tight text-foreground">Comprehensive Booking Log</CardTitle>
                      <CardDescription className="text-sm font-medium text-muted-foreground mt-1">{filteredBookings.length} records processed for the selected period</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="bg-background font-semibold" onClick={() => exportBookingsExcel(filteredBookings, 'All_Bookings')} disabled={filteredBookings.length === 0}>
                        <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Export Excel
                      </Button>
                      <Button size="sm" variant="outline" className="bg-background font-semibold" onClick={() => exportBookingsPDF(filteredBookings, 'All_Bookings')} disabled={filteredBookings.length === 0}>
                        <FileText className="h-4 w-4 mr-2 text-blue-600" /> Download PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredBookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
                      <Package className="h-16 w-16 mb-4" />
                      <p className="font-bold uppercase tracking-widest text-xs">No active records found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-12 px-8">Reference #</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Type</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Agency</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Service Description</TableHead>
                            <TableHead className="text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Pax</TableHead>
                            <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                            <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground pr-8">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBookings.slice(0, 50).map(b => (
                            <TableRow key={b.id} className="border-b hover:bg-muted/30 transition-colors">
                              <TableCell className="px-8 py-4 font-sans font-medium text-xs text-blue-600 font-bold">{b.booking_number}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[10px] uppercase px-2 py-0.5">{b.booking_type}</Badge>
                              </TableCell>
                              <TableCell className="text-xs font-semibold text-muted-foreground truncate max-w-[120px]">{b.agencies?.agency_name || 'Individual'}</TableCell>
                              <TableCell className="text-xs font-bold text-foreground truncate max-w-[150px]">
                                {b.package_departures?.group_packages?.name || b.flights?.airline || b.hotels?.name || b.tours?.name || b.visas?.country || '—'}
                              </TableCell>
                              <TableCell className="text-center font-bold text-foreground">{b.passengers || 1}</TableCell>
                              <TableCell className="text-right font-bold text-foreground text-sm">${b.total_amount.toLocaleString()}</TableCell>
                              <TableCell>{getStatusBadge(b.status)}</TableCell>
                              <TableCell className="text-right pr-8 text-[10px] font-bold text-muted-foreground">{b.created_at ? format(new Date(b.created_at), 'dd/MM/yy') : '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {filteredBookings.length > 50 && (
                        <div className="p-4 text-center border-t bg-muted/10">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Showing latest 50 of {filteredBookings.length} audit entries</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="packages" className="space-y-4"><TypeSummaryCards data={packageBookings} label="Package Bookings" icon={Package} /><BookingTable data={packageBookings} type="package" /></TabsContent>
            <TabsContent value="flights" className="space-y-4"><TypeSummaryCards data={flightBookings} label="Flight Bookings" icon={PlaneTakeoff} /><BookingTable data={flightBookings} type="flight" /></TabsContent>
            <TabsContent value="hotels" className="space-y-4"><TypeSummaryCards data={hotelBookings} label="Hotel Bookings" icon={Hotel} /><BookingTable data={hotelBookings} type="hotel" /></TabsContent>
            <TabsContent value="tours" className="space-y-4"><TypeSummaryCards data={tourBookings} label="Tour Bookings" icon={Compass} /><BookingTable data={tourBookings} type="tour" /></TabsContent>
            <TabsContent value="visas" className="space-y-4"><TypeSummaryCards data={visaBookings} label="Visa Bookings" icon={Stamp} /><BookingTable data={visaBookings} type="visa" /></TabsContent>
            <TabsContent value="agencies"><AgencyPerformance /></TabsContent>
            <TabsContent value="destinations"><DestinationsReport bookings={filteredBookings} /></TabsContent>
            <TabsContent value="financial"><FinancialSummaryReport bookings={filteredBookings} /></TabsContent>
            <TabsContent value="debts"><DebtsAgingReport bookings={filteredBookings} /></TabsContent>
            <TabsContent value="changes"><ChangeTrackingReport /></TabsContent>
          </Tabs>
        </TabsContent>

        {/* ════════════════ PERFORMANCE TAB ════════════════ */}
        <TabsContent value="analytics" className="space-y-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-8 rounded-3xl border shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-none font-bold text-[10px] uppercase tracking-wider px-2">Trend Analysis</Badge>
                <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Growth Metrics</span>
              </div>
              <h2 className="text-3xl font-bold text-foreground tracking-tight">Performance Intelligence</h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Strategic growth trajectory and regional distribution analysis.</p>
            </div>
            <Button onClick={exportUniversalReport} size="lg" className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider shadow-md">
              <FileSpreadsheet className="h-5 w-5 mr-3" /> Master Export
            </Button>
          </div>

          {!analyticsData ? (
            <div className="flex flex-col items-center justify-center py-40 bg-card rounded-3xl border shadow-sm">
              <BarChart3 className="h-16 w-16 text-muted-foreground/20 mb-6" />
              <p className="font-bold text-muted-foreground uppercase tracking-widest text-sm">No analytics data available</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Performance Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Revenue", value: `$${analyticsData.totals.revenue.toLocaleString()}`, growth: analyticsData.growth.revenue, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Total Bookings", value: analyticsData.totals.bookings, growth: analyticsData.growth.bookings, icon: Package, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Conversion Rate", value: `${analyticsData.totals.bookings > 0 ? ((analyticsData.totals.confirmed / analyticsData.totals.bookings) * 100).toFixed(1) : 0}%`, sub: `${analyticsData.totals.confirmed} confirmed ops`, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
                  { label: "Total Passengers", value: analyticsData.totals.passengers, sub: `Avg ${(analyticsData.totals.passengers / (analyticsData.totals.bookings || 1)).toFixed(1)} per order`, icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
                ].map((m, i) => (
                  <Card key={i} className="border-none shadow-sm bg-card hover:shadow-md transition-all duration-300 group">
                    <CardContent className="p-8">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{m.label}</p>
                          <p className="text-3xl font-bold text-foreground mt-1 tracking-tight tabular-nums">{m.value}</p>
                          {m.growth !== undefined ? (
                            <div className="flex items-center gap-1.5 pt-2">
                              {m.growth >= 0 ? <ArrowUpRight className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-rose-600" />}
                              <span className={cn("text-[11px] font-bold tracking-wider", m.growth >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                {m.growth >= 0 ? "+" : ""}{m.growth.toFixed(1)}% vs last month
                              </span>
                            </div>
                          ) : (
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest pt-2">{m.sub}</p>
                          )}
                        </div>
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", m.bg)}>
                          <m.icon className={cn("h-6 w-6", m.color)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Trajectory Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="p-8 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold uppercase tracking-tight">Revenue Momentum</CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-wider">Confirmed revenue trajectory over 6 months</CardDescription>
                      </div>
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.monthlyData}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" fontSize={11} fontWeight={600} tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <YAxis fontSize={11} fontWeight={600} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="p-8 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold uppercase tracking-tight">Operational Distribution</CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-wider">Status breakdown of current activity</CardDescription>
                      </div>
                      <BarChart3 className="h-5 w-5 text-indigo-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.statusDistribution} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                          <XAxis type="number" fontSize={11} fontWeight={600} tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" fontSize={11} fontWeight={600} tickFormatter={(value) => statusLabels[value] || value} width={120} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Ranking Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="p-8 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg font-bold uppercase tracking-tight">Top Regions</CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-wider">Destinations ranked by total revenue</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-4">
                      {analyticsData.topDestinations.map((dest, i) => (
                        <div key={dest.name} className="flex items-center justify-between p-4 rounded-2xl border bg-muted/20 hover:bg-muted/40 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs ${i === 0 ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"}`}>
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground uppercase">{dest.name}</p>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{dest.bookings} Bookings</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground tracking-tight">${dest.value.toLocaleString()}</p>
                            <div className="h-1.5 w-32 bg-muted rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${(dest.value / analyticsData.topDestinations[0].value) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="p-8 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-emerald-600" />
                      <div>
                        <CardTitle className="text-lg font-bold uppercase tracking-tight">Key Agencies</CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-wider">Top performing partners by valuation</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-4">
                      {analyticsData.topAgencies.map((agency, i) => (
                        <div key={agency.name} className="flex items-center justify-between p-4 rounded-2xl border bg-muted/20 hover:bg-muted/40 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs ${i === 0 ? "bg-emerald-600 text-white shadow-sm" : "bg-muted text-muted-foreground"}`}>
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground uppercase truncate max-w-[150px]">{agency.name}</p>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{agency.bookings} Unit Flow</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground tracking-tight">${agency.value.toLocaleString()}</p>
                            <div className="h-1.5 w-32 bg-muted rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-emerald-600" style={{ width: `${(agency.value / analyticsData.topAgencies[0].value) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ════════════════ CALENDAR TAB ════════════════ */}
        <TabsContent value="calendar" className="space-y-8 animate-fade-in">
          {/* Monthly Operational Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { label: "Total Bookings", value: monthStats.totalBookings, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Confirmed", value: monthStats.confirmedBookings, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Pending", value: monthStats.pendingBookings, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Departures", value: monthStats.totalDepartures, icon: Plane, color: "text-rose-600", bg: "bg-rose-50" },
              { label: "Total Pax", value: monthStats.totalPassengers, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
            ].map((s, i) => (
              <Card key={i} className="border-none shadow-sm bg-card hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", s.bg)}>
                      <s.icon className={cn("h-6 w-6", s.color)} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground tracking-tight">{s.value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Operational Calendar */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="p-8 border-b bg-muted/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <CardTitle className="text-2xl font-bold tracking-tight flex items-center gap-3">
                  <CalendarIcon className="h-6 w-6 text-primary" />
                  {format(currentMonth, "MMMM yyyy")}
                </CardTitle>
                <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-2xl border">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-card" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-5 w-5" /></Button>
                  <Button variant="ghost" className="h-10 px-4 rounded-xl hover:bg-card font-bold text-[10px] uppercase tracking-widest" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-card" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-5 w-5" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-7 mb-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-3">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-4">
                {calendarDays.map((day) => {
                  const events = getEventsForDate(day);
                  const isCurrentMonth2 = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());
                  const hasDepartures = events.some((e) => e.type === "departure");
                  const confirmedCount = events.filter((e) => e.type === "booking" && e.status === "confirmed").length;
                  const pendingCount = events.filter((e) => e.type === "booking" && (e.status === "pending_payment" || e.status === "payment_under_review")).length;

                  return (
                    <button key={day.toISOString()} onClick={() => handleDateClick(day)} className={cn(
                      "min-h-[120px] p-4 rounded-2xl border transition-all text-left relative",
                      isCurrentMonth2 ? "bg-card border-muted/50 hover:border-primary hover:shadow-md" : "bg-muted/5 opacity-30 pointer-events-none",
                      isToday && "border-primary bg-primary/5 ring-1 ring-primary ring-opacity-20",
                      events.length > 0 && "cursor-pointer"
                    )}>
                      <div className="flex items-start justify-between">
                        <span className={cn(
                          "text-sm font-bold tracking-tight",
                          isToday ? "bg-primary text-white h-7 w-7 flex items-center justify-center rounded-lg" : "text-foreground/60"
                        )}>{format(day, "d")}</span>
                      </div>
                      <div className="mt-4 space-y-2">
                        {hasDepartures && (
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-rose-600 uppercase tracking-wider">
                            <Plane className="h-3 w-3" /> {events.filter((e) => e.type === "departure").length} Departures
                          </div>
                        )}
                        {confirmedCount > 0 && (
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> {confirmedCount} Confirmed
                          </div>
                        )}
                        {pendingCount > 0 && (
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-600" /> {pendingCount} Pending
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Calendar Legend */}
          <Card className="border-none shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2"><Plane className="h-4 w-4 text-rose-600" /><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Departures</span></div>
                <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-600" /><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirmed Bookings</span></div>
                <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-amber-600" /><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Payments</span></div>
                <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-blue-600" /><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Under Review</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Operational Details Modal */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-2xl bg-card border shadow-2xl p-0 overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/5 pointer-events-none" />
              <DialogHeader className="p-8 border-b bg-muted/30 relative z-10">
                <DialogTitle className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                    <CalendarIcon className="h-6 w-6" />
                  </div>
                  {selectedDate && format(selectedDate, "eeee, dd MMMM yyyy")}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground mt-2">Operational activity log for the selected calendar cycle.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] p-8 relative z-10">
                <div className="space-y-6">
                  {selectedDate && getEventsForDate(selectedDate).length === 0 ? (
                    <div className="text-center py-24 text-muted-foreground/30 font-bold uppercase tracking-widest">No activities recorded</div>
                  ) : (
                    selectedDate && getEventsForDate(selectedDate).map((event) => (
                      <div key={`${event.type}-${event.id}`} className="group p-6 rounded-3xl border bg-muted/20 hover:bg-muted/40 transition-all duration-300">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-5">
                            <div className={cn(
                              "h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm",
                              event.type === "departure" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                            )}>
                              {event.type === "departure" ? <Plane className="h-6 w-6" /> : <Package className="h-6 w-6" />}
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-foreground uppercase tracking-tight">{event.title}</h4>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{event.type === "departure" ? "Scheduled Departure" : "Client Booking"}</p>
                            </div>
                          </div>
                          {event.type === "booking" && event.status && (
                            <Badge className={cn("rounded-lg px-3 py-1 font-bold text-[10px] uppercase tracking-wider", statusColors[event.status])}>
                              {statusLabels[event.status]}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-muted">
                          {event.destination && (
                            <div className="flex items-center gap-3">
                              <MapPin className="h-4 w-4 text-muted-foreground/40" />
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{event.destination}</span>
                            </div>
                          )}
                          {event.type === "booking" && event.passengers && (
                            <div className="flex items-center gap-3">
                              <Users className="h-4 w-4 text-muted-foreground/40" />
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{event.passengers} Passengers</span>
                            </div>
                          )}
                          {event.type === "departure" && event.availableSeats !== undefined && (
                            <div className="flex items-center gap-3">
                              <ShieldCheck className="h-4 w-4 text-emerald-600" />
                              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{event.availableSeats} Seats Available</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
