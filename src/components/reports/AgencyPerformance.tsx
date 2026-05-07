import { useMemo, useState } from "react";
import { 
  Trophy, 
  Building2, 
  TrendingUp, 
  DollarSign,
  Package,
  ArrowUpRight,
  CalendarRange,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { useAgencies } from "@/hooks/useAgencies";
import { exportToExcel } from "@/utils/excelExport";
import jsPDF from "jspdf";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

const COLORS = ['hsl(231, 70%, 30%)', 'hsl(6, 100%, 69%)', 'hsl(45, 100%, 51%)', 'hsl(142, 76%, 36%)', 'hsl(270, 70%, 60%)'];

interface AgencyStats {
  agencyId: string;
  agencyName: string;
  totalBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  packageCount: number;
  flightCount: number;
  hotelCount: number;
  tourCount: number;
  visaCount: number;
  commissionRate: number;
  commissionEarned: number;
  outstandingDebt: number;
}

interface DateRange {
  from: string;
  to: string;
}

export function AgencyPerformance() {
  const { data: bookings, isLoading } = useBookings();
  const { data: agencies } = useAgencies();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const setQuickFilter = (preset: 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'thisYear' | 'allTime') => {
    const now = new Date();
    let from: Date;
    let to: Date = now;

    switch (preset) {
      case 'thisMonth':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'lastMonth':
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      case 'last3Months':
        from = startOfMonth(subMonths(now, 3));
        break;
      case 'last6Months':
        from = startOfMonth(subMonths(now, 6));
        break;
      case 'thisYear':
        from = startOfMonth(new Date(now.getFullYear(), 0, 1));
        break;
      case 'allTime':
        from = new Date(2000, 0, 1);
        break;
      default:
        from = startOfMonth(now);
    }

    setDateRange({
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
    });
  };

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => {
      if (!b.created_at) return false;
      const date = parseISO(b.created_at);
      return isWithinInterval(date, {
        start: parseISO(dateRange.from),
        end: parseISO(dateRange.to),
      });
    });
  }, [bookings, dateRange]);

  const agencyStats = useMemo(() => {
    const statsMap = new Map<string, AgencyStats>();

    filteredBookings.forEach((b) => {
      const agencyId = b.agency_id || "direct";
      const agencyName = b.agencies?.agency_name || "Direct Booking";
      
      const existing = statsMap.get(agencyId) || {
        agencyId,
        agencyName,
        totalBookings: 0,
        confirmedBookings: 0,
        totalRevenue: 0,
        averageBookingValue: 0,
        packageCount: 0,
        flightCount: 0,
        hotelCount: 0,
        tourCount: 0,
        visaCount: 0,
        commissionRate: 0,
        commissionEarned: 0,
        outstandingDebt: 0,
      };

      existing.totalBookings += 1;
      if (b.status === "confirmed") existing.confirmedBookings += 1;
      existing.totalRevenue += b.total_amount || 0;
      
      if (b.booking_type === "package") existing.packageCount++;
      if (b.booking_type === "flight") existing.flightCount++;
      if (b.booking_type === "hotel") existing.hotelCount++;
      if (b.booking_type === "tour") existing.tourCount++;
      if (b.booking_type === "visa") existing.visaCount++;

      if (b.status !== "confirmed" && b.status !== "canceled") {
        existing.outstandingDebt += b.total_amount || 0;
      }

      statsMap.set(agencyId, existing);
    });

    statsMap.forEach((stat, id) => {
      const agency = agencies?.find(a => a.id === id);
      if (agency) {
        stat.commissionRate = agency.commission_rate || 0;
        stat.commissionEarned = (stat.totalRevenue * stat.commissionRate) / 100;
      }
      stat.averageBookingValue = stat.totalRevenue / (stat.totalBookings || 1);
    });

    return Array.from(statsMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredBookings, agencies]);

  const totalAgencyRevenue = agencyStats.reduce((sum, a) => sum + a.totalRevenue, 0);
  const totalAgencyBookings = agencyStats.reduce((sum, a) => sum + a.totalBookings, 0);
  const totalCommission = agencyStats.reduce((sum, a) => sum + a.commissionEarned, 0);
  const totalDebt = agencyStats.reduce((sum, a) => sum + a.outstandingDebt, 0);
  const activeAgencies = agencyStats.length;

  const handleExportExcel = () => {
    const rows = agencyStats.map((a, i) => ({
      "#": i + 1,
      Agency: a.agencyName,
      "Total Bookings": a.totalBookings,
      Confirmed: a.confirmedBookings,
      Packages: a.packageCount,
      Flights: a.flightCount,
      Hotels: a.hotelCount,
      Tours: a.tourCount,
      Visas: a.visaCount,
      "Revenue ($)": a.totalRevenue,
      "Avg Value ($)": Math.round(a.averageBookingValue),
      "Commission %": a.commissionRate,
      "Commission ($)": Math.round(a.commissionEarned),
      "Outstanding ($)": a.outstandingDebt,
    }));
    exportToExcel(rows, "Agency_Performance", `Agency_Performance_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const handleExportPDF = () => {
    const pdf = new jsPDF("l", "mm", "a4");
    pdf.setFontSize(16); pdf.text("Agency Performance Report", 14, 18);
    pdf.setFontSize(9);
    pdf.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")} | ${agencyStats.length} agencies | Revenue: $${totalAgencyRevenue.toLocaleString()}`, 14, 26);
    pdf.save(`Agency_Performance_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const chartData = agencyStats.slice(0, 10).map((agency, index) => ({
    name: agency.agencyName.length > 15 
      ? agency.agencyName.substring(0, 15) + "..." 
      : agency.agencyName,
    fullName: agency.agencyName,
    revenue: agency.totalRevenue,
    bookings: agency.totalBookings,
    color: COLORS[index % COLORS.length],
  }));

  const pieData = agencyStats.slice(0, 5).map((agency, index) => ({
    name: agency.agencyName,
    value: agency.totalRevenue,
    color: COLORS[index % COLORS.length],
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ═══════ BI PERFORMANCE HEADER ═══════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-8 rounded-3xl border shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold text-[10px] uppercase tracking-wider px-2">Partner Insights</Badge>
            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Network Analytics</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Agency Performance Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Real-time performance tracking and revenue analysis across all partners.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="flex items-center gap-2 bg-muted/30 border rounded-2xl p-1">
            <DateInput 
              value={dateRange.from} 
              onValueChange={(val) => setDateRange(prev => ({ ...prev, from: val }))} 
              className="bg-transparent border-0 h-9 w-32 text-xs font-bold uppercase tracking-wider"
            />
            <div className="w-[1px] h-4 bg-border" />
            <DateInput 
              value={dateRange.to} 
              onValueChange={(val) => setDateRange(prev => ({ ...prev, to: val }))} 
              className="bg-transparent border-0 h-9 w-32 text-xs font-bold uppercase tracking-wider"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportExcel} size="lg" className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" size="lg" onClick={handleExportPDF} className="rounded-2xl border-muted bg-card font-bold text-xs uppercase tracking-wider shadow-sm">
              <FileText className="h-4 w-4 mr-2 text-blue-600" /> PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Reporting Period Filter */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-4 bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'thisMonth', label: 'This Month' },
                { id: 'lastMonth', label: 'Last Month' },
                { id: 'last3Months', label: 'Quarterly' },
                { id: 'last6Months', label: 'Half Year' },
                { id: 'thisYear', label: 'Yearly' },
                { id: 'allTime', label: 'All Time' }
              ].map(p => (
                <Button key={p.id} size="sm" variant="ghost" onClick={() => setQuickFilter(p.id as any)} className="h-9 px-4 rounded-xl hover:bg-card hover:shadow-sm text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-all">
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Active Agency Partners: <span className="text-foreground ml-1">{activeAgencies}</span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Active Agencies", value: activeAgencies, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Gross Revenue", value: `$${totalAgencyRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Bookings", value: totalAgencyBookings, icon: Package, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Total Commission", value: `$${Math.round(totalCommission).toLocaleString()}`, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Total Outstanding", value: `$${totalDebt.toLocaleString()}`, icon: DollarSign, color: "text-destructive", bg: "bg-destructive/5" },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", s.bg)}>
                  <s.icon className={cn("h-6 w-6", s.color)} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                  <p className="text-xl font-bold text-foreground mt-0.5 tracking-tight">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="p-8 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-amber-500" />
              <div>
                <CardTitle className="text-lg font-bold">Top Agency Performance</CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wider">Ranking by total revenue generated</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {chartData.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground/30 font-bold uppercase tracking-widest">No agency activity found</div>
            ) : (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" fontSize={11} fontWeight={500} axisLine={false} tickLine={false} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" fontSize={11} fontWeight={500} axisLine={false} tickLine={false} width={120} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="p-8 border-b bg-muted/30">
            <CardTitle className="text-lg font-bold text-center">Revenue Market Share</CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-center">Concentration among top 5 agency partners</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {pieData.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground/30 font-bold uppercase tracking-widest">No market data available</div>
            ) : (
              <>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-8 justify-center">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/30 border border-muted transition-colors hover:bg-muted/50">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agency Performance Details Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-8 bg-muted/30 border-b">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl font-bold">Agency Performance Ledger</CardTitle>
              <CardDescription className="text-sm font-medium">Detailed audit of all partner activity and financial metrics</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="bg-card font-bold text-xs uppercase tracking-wider" disabled={agencyStats.length === 0}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="bg-card font-bold text-xs uppercase tracking-wider" disabled={agencyStats.length === 0}>
                <FileText className="h-4 w-4 mr-2 text-blue-600" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {agencyStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
              <Building2 className="h-12 w-12 mb-3" />
              <p className="font-bold uppercase tracking-widest text-xs">No agency activity detected</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="w-16 text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground px-8">Rank</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Agency Name</TableHead>
                    <TableHead className="text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Orders</TableHead>
                    <TableHead className="text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Conf.</TableHead>
                    <TableHead className="text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground">PKG</TableHead>
                    <TableHead className="text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground">FLT</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Commission</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground pr-8">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencyStats.map((agency, index) => (
                    <TableRow key={agency.agencyId} className="hover:bg-muted/30 transition-colors border-b">
                      <TableCell className="text-center px-8">
                        <span className={`inline-flex items-center justify-center h-7 w-7 rounded-lg text-xs font-bold ${index === 0 ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"}`}>
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">{agency.agencyName.charAt(0)}</div>
                          <span className="font-bold text-foreground text-sm">{agency.agencyName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-bold bg-muted/60">{agency.totalBookings}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold">{agency.confirmedBookings}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-[11px] font-bold text-muted-foreground">{agency.packageCount || "-"}</TableCell>
                      <TableCell className="text-center text-[11px] font-bold text-muted-foreground">{agency.flightCount || "-"}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">${agency.totalRevenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-indigo-600">${Math.round(agency.commissionEarned).toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-8">
                        <span className={cn("text-xs font-bold", agency.outstandingDebt > 0 ? "text-amber-600" : "text-emerald-600")}>
                          {agency.outstandingDebt > 0 ? `$${agency.outstandingDebt.toLocaleString()}` : "Settled"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
