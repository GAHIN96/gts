import { useState, useMemo } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Package,
  PlaneTakeoff, Hotel, Calendar as CalendarIcon, Building2, Compass, Stamp,
  FileSpreadsheet, FileText, Search, MapPin, Wallet, ChevronLeft, ChevronRight,
  Plane, History, AlertTriangle,
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
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

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--gold))", "hsl(var(--coral))", "hsl(var(--muted))"];
const COLORS_STATIC = ['hsl(231, 70%, 30%)', 'hsl(6, 100%, 69%)', 'hsl(45, 100%, 51%)', 'hsl(142, 76%, 36%)', 'hsl(270, 70%, 60%)'];

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_payment: "bg-gold/20 text-gold border-gold/30",
  payment_under_review: "bg-primary/20 text-primary border-primary/30",
  confirmed: "bg-success/20 text-success border-success/30",
  canceled: "bg-destructive/20 text-destructive border-destructive/30",
  refunded: "bg-muted text-muted-foreground",
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
  switch (status) {
    case 'confirmed': return <Badge className="bg-success/10 text-success border-success/20">Confirmed</Badge>;
    case 'pending_payment': return <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
    case 'payment_under_review': return <Badge className="bg-info/10 text-info border-info/20">Under Review</Badge>;
    case 'canceled': return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Canceled</Badge>;
    case 'refunded': return <Badge className="bg-muted text-muted-foreground">Refunded</Badge>;
    default: return <Badge variant="outline">Draft</Badge>;
  }
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

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading change data...</div>;

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
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total Changes</p><p className="text-xl font-bold">{updateLogs.length}</p></div><div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><History className="h-5 w-5 text-primary" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Important Changes</p><p className="text-xl font-bold">{majorChanges.length}</p></div><div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-gold" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Change Types</p><p className="text-xl font-bold">{changeTypeData.length}</p></div><div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-success" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Active Users</p><p className="text-xl font-bold">{Object.keys(userChanges).length}</p></div><div className="h-10 w-10 rounded-xl bg-coral/10 flex items-center justify-center"><Users className="h-5 w-5 text-coral" /></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Common Change Types */}
        <Card className="shadow-card">
          <CardHeader><CardTitle>Most Common Changes</CardTitle><CardDescription>Breakdown of booking modification types</CardDescription></CardHeader>
          <CardContent>
            {changeTypeData.length === 0 ? <p className="text-center py-8 text-muted-foreground">No changes recorded</p> : (
              <div className="space-y-3">
                {changeTypeData.map((ct) => (
                  <div key={ct.name} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{ct.name}</span>
                        <span className="text-sm font-bold">{ct.value}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (ct.value / Math.max(...changeTypeData.map(d => d.value))) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users with Most Changes */}
        <Card className="shadow-card">
          <CardHeader><CardTitle>Users with Most Changes</CardTitle><CardDescription>Top users by booking modifications</CardDescription></CardHeader>
          <CardContent>
            {topUsers.length === 0 ? <p className="text-center py-8 text-muted-foreground">No user data</p> : (
              <div className="space-y-3">
                {topUsers.map((u, i) => (
                  <div key={u.name} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-bold">{u.count} changes</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Changes Table */}
      <Card className="shadow-card">
        <CardHeader><CardTitle>Recent Booking Changes</CardTitle><CardDescription>Latest modifications to bookings</CardDescription></CardHeader>
        <CardContent>
          {updateLogs.length === 0 ? <p className="text-center py-12 text-muted-foreground">No changes recorded</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Booking</TableHead><TableHead>Change</TableHead><TableHead>Before</TableHead><TableHead>After</TableHead><TableHead>User</TableHead><TableHead>Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {updateLogs.slice(0, 50).map(log => {
                    const change = getChangeDescription(log as any);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">{log.entity_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", change.severity === "major" ? "border-destructive/30 text-destructive" : change.severity === "important" ? "border-gold/30 text-gold" : "")}>
                            {change.changeType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{change.before}</TableCell>
                        <TableCell className="text-sm font-medium">{change.after}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.user_email || 'System'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(log.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {updateLogs.length > 50 && <p className="text-sm text-muted-foreground text-center mt-3">Showing first 50 of {updateLogs.length} changes</p>}
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

    return {
      monthlyData, topDestinations, statusDistribution, seasonalData,
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
    { title: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
    { title: "Total Bookings", value: filteredBookings.length.toString(), icon: Package, color: "text-success", bg: "bg-success/10" },
    { title: "Confirmed Revenue", value: `$${confirmedRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-gold", bg: "bg-gold/10" },
    { title: "Active Packages", value: (packages?.filter(p => p.is_active).length || 0).toString(), icon: Package, color: "text-coral", bg: "bg-coral/10" },
  ];

  const revenueByType = [
    { name: 'Packages', value: packageBookings.reduce((s, b) => s + b.total_amount, 0) },
    { name: 'Flights', value: flightBookings.reduce((s, b) => s + b.total_amount, 0) },
    { name: 'Hotels', value: hotelBookings.reduce((s, b) => s + b.total_amount, 0) },
    { name: 'Tours', value: tourBookings.reduce((s, b) => s + b.total_amount, 0) },
    { name: 'Visas', value: visaBookings.reduce((s, b) => s + b.total_amount, 0) },
  ].filter(d => d.value > 0);

  const BookingTable = ({ data, type }: { data: Booking[]; type: string }) => (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="capitalize">{type} Bookings</CardTitle>
            <CardDescription>{data.length} bookings | Revenue: ${data.reduce((s, b) => s + b.total_amount, 0).toLocaleString()}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => exportBookingsExcel(data, type)} disabled={data.length === 0}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
            <Button size="sm" variant="outline" onClick={() => exportBookingsPDF(data, type)} disabled={data.length === 0}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><Package className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No {type} bookings found for selected period</p></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Booking #</TableHead><TableHead>Agency</TableHead><TableHead>Service</TableHead><TableHead>Destination</TableHead>
                {type === 'package' && <TableHead>Departure</TableHead>}
                {type === 'flight' && <TableHead>Route</TableHead>}
                {type === 'hotel' && <TableHead>Hotel</TableHead>}
                <TableHead className="text-center">Pax</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">{b.booking_number}</TableCell>
                    <TableCell>{b.agencies?.agency_name || 'N/A'}</TableCell>
                    <TableCell>
                      {type === 'package' && (b.package_departures?.group_packages?.name || 'N/A')}
                      {type === 'flight' && (b.flights?.airline || 'N/A')}
                      {type === 'hotel' && (b.hotels?.name || 'N/A')}
                      {type === 'tour' && (b.tours?.name || 'N/A')}
                      {type === 'visa' && (b.visas ? `${b.visas.country} - ${b.visas.visa_type}` : 'N/A')}
                    </TableCell>
                    <TableCell>
                      {type === 'package' && (b.package_departures?.group_packages?.cities?.name || 'N/A')}
                      {type === 'flight' && (b.flights?.arrival_city || 'N/A')}
                      {type === 'hotel' && (b.hotels?.cities?.name || 'N/A')}
                      {type === 'tour' && (b.tours?.cities?.name || 'N/A')}
                      {type === 'visa' && (b.visas?.country || 'N/A')}
                    </TableCell>
                    {type === 'package' && <TableCell>{b.package_departures?.departure_date ? format(new Date(b.package_departures.departure_date), 'dd/MM/yyyy') : 'N/A'}</TableCell>}
                    {type === 'flight' && <TableCell className="text-sm">{b.flights ? `${b.flights.departure_city} → ${b.flights.arrival_city}` : 'N/A'}</TableCell>}
                    {type === 'hotel' && <TableCell>{b.hotels?.name || 'N/A'}</TableCell>}
                    <TableCell className="text-center">{b.passengers || 1}</TableCell>
                    <TableCell className="text-right font-medium">${b.total_amount.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(b.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.created_at ? format(new Date(b.created_at), 'dd/MM/yyyy') : ''}</TableCell>
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total {label}</p><p className="text-xl font-bold">{data.length}</p></div><div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-xl font-bold">${rev.toLocaleString()}</p></div><div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-success" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Confirmed</p><p className="text-xl font-bold">${confRev.toLocaleString()}</p></div><div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-gold" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Passengers</p><p className="text-xl font-bold">{pax}</p></div><div className="h-10 w-10 rounded-xl bg-coral/10 flex items-center justify-center"><Users className="h-5 w-5 text-coral" /></div></div></CardContent></Card>
      </div>
    );
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-64" /><div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground">Comprehensive reports, analytics, and calendar view</p>
      </div>

      {/* Main Tab Switcher */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
        <TabsList className="h-auto gap-1 p-1">
          <TabsTrigger value="reports" className="gap-1.5"><BarChart3 className="h-4 w-4" />Reports</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><TrendingUp className="h-4 w-4" />Analytics</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarIcon className="h-4 w-4" />Calendar</TabsTrigger>
        </TabsList>

        {/* ════════════════ REPORTS TAB ════════════════ */}
        <TabsContent value="reports" className="space-y-6">
          {/* Date Range & Filters */}
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-wrap gap-2">
                  {['thisMonth', 'lastMonth', 'last3Months', 'last6Months', 'thisYear', 'allTime'].map(p => (
                    <Button key={p} size="sm" variant="outline" onClick={() => setQuickFilter(p)} className="text-xs">
                      {p === 'thisMonth' ? 'This Month' : p === 'lastMonth' ? 'Last Month' : p === 'last3Months' ? '3 Months' : p === 'last6Months' ? '6 Months' : p === 'thisYear' ? 'This Year' : 'All Time'}
                    </Button>
                  ))}
                </div>
                <div className="flex items-end gap-2 ml-auto">
                  <div><Label className="text-xs">From</Label><DateInput value={dateRange.from} onValueChange={v => setDateRange(p => ({ ...p, from: v }))} className="w-36 h-9" /></div>
                  <div><Label className="text-xs">To</Label><DateInput value={dateRange.to} onValueChange={v => setDateRange(p => ({ ...p, to: v }))} className="w-36 h-9" /></div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search booking number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_payment">Pending Payment</SelectItem>
                    <SelectItem value="payment_under_review">Under Review</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Report Sub-Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-4 w-4" />Overview</TabsTrigger>
              <TabsTrigger value="packages" className="gap-1.5"><Package className="h-4 w-4" />Packages <Badge variant="secondary" className="ml-1 text-xs">{packageBookings.length}</Badge></TabsTrigger>
              <TabsTrigger value="flights" className="gap-1.5"><PlaneTakeoff className="h-4 w-4" />Flights <Badge variant="secondary" className="ml-1 text-xs">{flightBookings.length}</Badge></TabsTrigger>
              <TabsTrigger value="hotels" className="gap-1.5"><Hotel className="h-4 w-4" />Hotels <Badge variant="secondary" className="ml-1 text-xs">{hotelBookings.length}</Badge></TabsTrigger>
              <TabsTrigger value="tours" className="gap-1.5"><Compass className="h-4 w-4" />Tours <Badge variant="secondary" className="ml-1 text-xs">{tourBookings.length}</Badge></TabsTrigger>
              <TabsTrigger value="visas" className="gap-1.5"><Stamp className="h-4 w-4" />Visas <Badge variant="secondary" className="ml-1 text-xs">{visaBookings.length}</Badge></TabsTrigger>
              <TabsTrigger value="agencies" className="gap-1.5"><Building2 className="h-4 w-4" />Agencies</TabsTrigger>
              <TabsTrigger value="destinations" className="gap-1.5"><MapPin className="h-4 w-4" />Destinations</TabsTrigger>
              <TabsTrigger value="financial" className="gap-1.5"><Wallet className="h-4 w-4" />Financial</TabsTrigger>
              <TabsTrigger value="debts" className="gap-1.5"><Building2 className="h-4 w-4" />Debts & Aging</TabsTrigger>
              <TabsTrigger value="changes" className="gap-1.5"><History className="h-4 w-4" />Change Tracking</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                  <Card key={i} className="shadow-card"><CardContent className="p-6"><div className="flex items-start justify-between"><div className="space-y-1"><p className="text-sm text-muted-foreground">{s.title}</p><p className="text-2xl font-bold">{s.value}</p></div><div className={`h-12 w-12 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`h-6 w-6 ${s.color}`} /></div></div></CardContent></Card>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-card"><CardHeader><CardTitle>Revenue by Category</CardTitle><CardDescription>Revenue distribution across booking types</CardDescription></CardHeader><CardContent>
                  {revenueByType.length === 0 ? <p className="text-center py-8 text-muted-foreground">No data</p> : (
                    <>
                      <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={revenueByType} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value">{revenueByType.map((_, i) => <Cell key={i} fill={COLORS_STATIC[i % COLORS_STATIC.length]} />)}</Pie><Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} /></PieChart></ResponsiveContainer></div>
                      <div className="flex flex-wrap gap-3 mt-3 justify-center">{revenueByType.map((d, i) => (<div key={d.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS_STATIC[i % COLORS_STATIC.length] }} /><span className="text-sm text-muted-foreground">{d.name}: ${d.value.toLocaleString()}</span></div>))}</div>
                    </>
                  )}
                </CardContent></Card>
                <Card className="shadow-card"><CardHeader><CardTitle>Bookings by Category</CardTitle><CardDescription>Number of bookings per type</CardDescription></CardHeader><CardContent><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={[
                  { name: 'Packages', count: packageBookings.length }, { name: 'Flights', count: flightBookings.length }, { name: 'Hotels', count: hotelBookings.length }, { name: 'Tours', count: tourBookings.length }, { name: 'Visas', count: visaBookings.length },
                ]}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} /><Tooltip contentStyle={{ borderRadius: '8px' }} /><Bar dataKey="count" name="Bookings" fill="hsl(231, 70%, 30%)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
              </div>
              {/* All Bookings table */}
              <Card className="shadow-card"><CardHeader><div className="flex items-center justify-between flex-wrap gap-3"><div><CardTitle>All Bookings</CardTitle><CardDescription>{filteredBookings.length} bookings in selected period</CardDescription></div><div className="flex gap-2">
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => exportBookingsExcel(filteredBookings, 'All_Bookings')} disabled={filteredBookings.length === 0}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
                <Button size="sm" variant="outline" onClick={() => exportBookingsPDF(filteredBookings, 'All_Bookings')} disabled={filteredBookings.length === 0}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
              </div></div></CardHeader><CardContent>
                {filteredBookings.length === 0 ? <p className="text-center py-12 text-muted-foreground">No bookings found</p> : (
                  <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Booking #</TableHead><TableHead>Type</TableHead><TableHead>Agency</TableHead><TableHead>Service</TableHead><TableHead className="text-center">Pax</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>
                    {filteredBookings.slice(0, 50).map(b => (<TableRow key={b.id}><TableCell className="font-mono text-sm">{b.booking_number}</TableCell><TableCell><Badge variant="outline" className="capitalize">{b.booking_type}</Badge></TableCell><TableCell>{b.agencies?.agency_name || 'N/A'}</TableCell><TableCell>{b.package_departures?.group_packages?.name || b.flights?.airline || b.hotels?.name || b.tours?.name || b.visas?.country || 'N/A'}</TableCell><TableCell className="text-center">{b.passengers || 1}</TableCell><TableCell className="text-right font-medium">${b.total_amount.toLocaleString()}</TableCell><TableCell>{getStatusBadge(b.status)}</TableCell><TableCell className="text-sm text-muted-foreground">{b.created_at ? format(new Date(b.created_at), 'dd/MM/yyyy') : ''}</TableCell></TableRow>))}
                  </TableBody></Table>
                  {filteredBookings.length > 50 && <p className="text-sm text-muted-foreground text-center mt-3">Showing first 50 of {filteredBookings.length} bookings. Export for full data.</p>}
                  </div>
                )}
              </CardContent></Card>
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

        {/* ════════════════ ANALYTICS TAB ════════════════ */}
        <TabsContent value="analytics" className="space-y-6">
          {!analyticsData ? (
            <div className="text-center py-12 text-muted-foreground"><BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No booking data available for analytics</p></div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-card"><CardContent className="p-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold text-foreground">${analyticsData.totals.revenue.toLocaleString()}</p><div className="flex items-center gap-1 mt-1">{analyticsData.growth.revenue >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}<span className={`text-sm ${analyticsData.growth.revenue >= 0 ? "text-success" : "text-destructive"}`}>{analyticsData.growth.revenue >= 0 ? "+" : ""}{analyticsData.growth.revenue.toFixed(1)}%</span><span className="text-sm text-muted-foreground">vs last month</span></div></div><div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><DollarSign className="h-6 w-6 text-primary" /></div></div></CardContent></Card>
                <Card className="shadow-card"><CardContent className="p-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">Total Bookings</p><p className="text-2xl font-bold text-foreground">{analyticsData.totals.bookings}</p><div className="flex items-center gap-1 mt-1">{analyticsData.growth.bookings >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}<span className={`text-sm ${analyticsData.growth.bookings >= 0 ? "text-success" : "text-destructive"}`}>{analyticsData.growth.bookings >= 0 ? "+" : ""}{analyticsData.growth.bookings.toFixed(1)}%</span><span className="text-sm text-muted-foreground">vs last month</span></div></div><div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center"><Package className="h-6 w-6 text-success" /></div></div></CardContent></Card>
                <Card className="shadow-card"><CardContent className="p-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">Confirmed</p><p className="text-2xl font-bold text-foreground">{analyticsData.totals.confirmed}</p><p className="text-sm text-muted-foreground mt-1">{analyticsData.totals.bookings > 0 ? ((analyticsData.totals.confirmed / analyticsData.totals.bookings) * 100).toFixed(1) : 0}% conversion rate</p></div><div className="h-12 w-12 rounded-xl bg-gold/10 flex items-center justify-center"><CalendarIcon className="h-6 w-6 text-gold" /></div></div></CardContent></Card>
                <Card className="shadow-card"><CardContent className="p-6"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">Total Passengers</p><p className="text-2xl font-bold text-foreground">{analyticsData.totals.passengers}</p><p className="text-sm text-muted-foreground mt-1">Avg {analyticsData.totals.bookings > 0 ? (analyticsData.totals.passengers / analyticsData.totals.bookings).toFixed(1) : 0} per booking</p></div><div className="h-12 w-12 rounded-xl bg-coral/10 flex items-center justify-center"><Users className="h-6 w-6 text-coral" /></div></div></CardContent></Card>
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-card"><CardHeader><CardTitle>Booking Trends</CardTitle><CardDescription>Monthly bookings and revenue over the last 6 months</CardDescription></CardHeader><CardContent><div className="h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analyticsData.monthlyData}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" className="text-xs" /><YAxis yAxisId="left" className="text-xs" /><YAxis yAxisId="right" orientation="right" className="text-xs" /><Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} labelFormatter={(label) => { const data = analyticsData.monthlyData.find((d) => d.month === label); return data?.fullMonth || label; }} /><Legend /><Area yAxisId="left" type="monotone" dataKey="bookings" name="Bookings" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" /><Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue ($)" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.2)" /></AreaChart></ResponsiveContainer></div></CardContent></Card>

                <Card className="shadow-card"><CardHeader><CardTitle>Revenue by Destination</CardTitle><CardDescription>Top 5 destinations by total revenue</CardDescription></CardHeader><CardContent>
                  <div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analyticsData.topDestinations} cx="50%" cy="50%" outerRadius={100} fill="hsl(var(--primary))" dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>{analyticsData.topDestinations.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} /></PieChart></ResponsiveContainer></div>
                  <div className="flex flex-wrap gap-3 mt-4 justify-center">{analyticsData.topDestinations.map((dest, index) => (<div key={dest.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="text-sm text-muted-foreground">{dest.name} ({dest.bookings} bookings)</span></div>))}</div>
                </CardContent></Card>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-card"><CardHeader><CardTitle>Booking Status Distribution</CardTitle><CardDescription>Current status of all bookings</CardDescription></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={analyticsData.statusDistribution} layout="vertical"><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis type="number" className="text-xs" /><YAxis type="category" dataKey="name" className="text-xs" tickFormatter={(value) => statusLabels[value] || value} width={100} /><Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => [value, "Bookings"]} labelFormatter={(label) => statusLabels[label] || label} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>

                <Card className="shadow-card"><CardHeader><CardTitle>Travel Seasonality</CardTitle><CardDescription>Booking patterns by travel month</CardDescription></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={analyticsData.seasonalData}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" className="text-xs" /><YAxis className="text-xs" /><Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} /><Legend /><Bar dataKey="bookings" name="Bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /><Bar dataKey="passengers" name="Passengers" fill="hsl(var(--coral))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
              </div>

              {/* Top Destinations */}
              <Card className="shadow-card"><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Top Performing Destinations</CardTitle><CardDescription>Destinations ranked by revenue and booking volume</CardDescription></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {analyticsData.topDestinations.map((dest, index) => (<div key={dest.name} className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"><div className="flex items-center justify-between mb-2"><Badge className={index === 0 ? "bg-gold text-white" : index === 1 ? "bg-muted text-foreground" : "bg-coral/20 text-coral"}>#{index + 1}</Badge><MapPin className="h-4 w-4 text-muted-foreground" /></div><h4 className="font-semibold text-foreground">{dest.name}</h4><p className="text-lg font-bold text-primary">${dest.value.toLocaleString()}</p><p className="text-sm text-muted-foreground">{dest.bookings} bookings</p></div>))}
              </div></CardContent></Card>
            </>
          )}
        </TabsContent>

        {/* ════════════════ CALENDAR TAB ════════════════ */}
        <TabsContent value="calendar" className="space-y-6">
          {/* Month Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="shadow-card"><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{monthStats.totalBookings}</p><p className="text-xs text-muted-foreground">Total Bookings</p></div></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><Package className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold text-success">{monthStats.confirmedBookings}</p><p className="text-xs text-muted-foreground">Confirmed</p></div></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center"><Package className="h-5 w-5 text-gold" /></div><div><p className="text-2xl font-bold text-gold">{monthStats.pendingBookings}</p><p className="text-xs text-muted-foreground">Pending</p></div></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-coral/10 flex items-center justify-center"><Plane className="h-5 w-5 text-coral" /></div><div><p className="text-2xl font-bold">{monthStats.totalDepartures}</p><p className="text-xs text-muted-foreground">Departures</p></div></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{monthStats.totalPassengers}</p><p className="text-xs text-muted-foreground">Passengers</p></div></CardContent></Card>
          </div>

          {/* Calendar */}
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5" />{format(currentMonth, "MMMM yyyy")}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 mb-2">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (<div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>))}</div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const events = getEventsForDate(day);
                  const isCurrentMonth2 = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());
                  const hasDepartures = events.some((e) => e.type === "departure");
                  const confirmedCount = events.filter((e) => e.type === "booking" && e.status === "confirmed").length;
                  const pendingCount = events.filter((e) => e.type === "booking" && (e.status === "pending_payment" || e.status === "payment_under_review")).length;
                  return (
                    <button key={day.toISOString()} onClick={() => handleDateClick(day)} className={cn("min-h-24 p-2 rounded-lg border text-left transition-colors", isCurrentMonth2 ? "bg-card hover:bg-muted/50" : "bg-muted/30 text-muted-foreground", isToday && "border-primary", events.length > 0 && "cursor-pointer")}>
                      <div className="flex items-start justify-between"><span className={cn("text-sm font-medium", isToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center")}>{format(day, "d")}</span></div>
                      <div className="mt-1 space-y-1">
                        {hasDepartures && <div className="flex items-center gap-1 text-xs"><Plane className="h-3 w-3 text-coral" /><span className="text-coral font-medium truncate">{events.filter((e) => e.type === "departure").length} departures</span></div>}
                        {confirmedCount > 0 && <Badge className="bg-success/20 text-success border-success/30 text-[10px] px-1.5 py-0">{confirmedCount} confirmed</Badge>}
                        {pendingCount > 0 && <Badge className="bg-gold/20 text-gold border-gold/30 text-[10px] px-1.5 py-0">{pendingCount} pending</Badge>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="shadow-card"><CardContent className="p-4"><div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2"><Plane className="h-4 w-4 text-coral" /><span className="text-sm text-muted-foreground">Departure</span></div>
            <div className="flex items-center gap-2"><Badge className="bg-success/20 text-success">Confirmed</Badge></div>
            <div className="flex items-center gap-2"><Badge className="bg-gold/20 text-gold">Pending</Badge></div>
            <div className="flex items-center gap-2"><Badge className="bg-primary/20 text-primary">Under Review</Badge></div>
          </div></CardContent></Card>

          {/* Day Details Modal */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{selectedDate && format(selectedDate, "dd/MM/yyyy")}</DialogTitle></DialogHeader>
              <ScrollArea className="max-h-96"><div className="space-y-4">
                {selectedDate && getEventsForDate(selectedDate).map((event) => (
                  <div key={`${event.type}-${event.id}`} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">{event.type === "departure" ? <Plane className="h-4 w-4 text-coral" /> : <Package className="h-4 w-4 text-primary" />}<span className="font-medium">{event.title}</span></div>
                      {event.type === "booking" && event.status && <Badge className={statusColors[event.status]}>{statusLabels[event.status]}</Badge>}
                    </div>
                    {event.destination && <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{event.destination}</div>}
                    {event.type === "booking" && event.passengers && <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1"><Users className="h-3 w-3" />{event.passengers} passengers</div>}
                    {event.type === "departure" && event.availableSeats !== undefined && <div className="text-sm text-muted-foreground mt-1">{event.availableSeats} seats available</div>}
                  </div>
                ))}
              </div></ScrollArea>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;