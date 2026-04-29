import { useMemo, useState } from "react";
import { 
  Trophy, 
  Building2, 
  TrendingUp, 
  DollarSign,
  Package,
  Users,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
} from "recharts";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { useAgencies } from "@/hooks/useAgencies";
import { exportToExcel } from "@/utils/excelExport";
import jsPDF from "jspdf";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, subMonths } from "date-fns";

const COLORS = ['hsl(231, 70%, 30%)', 'hsl(6, 100%, 69%)', 'hsl(45, 100%, 51%)', 'hsl(142, 76%, 36%)', 'hsl(270, 70%, 60%)'];

interface AgencyStats {
  agencyId: string;
  agencyName: string;
  totalBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  userId: string;
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
  // Date range filter state - default to current month
  const [dateRange, setDateRange] = useState<DateRange>({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  // Quick filter presets
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
        from = startOfMonth(subMonths(now, 2));
        to = endOfMonth(now);
        break;
      case 'last6Months':
        from = startOfMonth(subMonths(now, 5));
        to = endOfMonth(now);
        break;
      case 'thisYear':
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
      case 'allTime':
        from = new Date(2020, 0, 1);
        to = now;
        break;
    }

    setDateRange({
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
    });
  };

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    
    return bookings.filter((booking: Booking) => {
      if (!booking.created_at) return true;
      
      try {
        const bookingDate = parseISO(booking.created_at);
        const fromDate = parseISO(dateRange.from);
        const toDate = parseISO(dateRange.to);
        
        return isWithinInterval(bookingDate, { start: fromDate, end: toDate });
      } catch {
        return true;
      }
    });
  }, [bookings, dateRange]);

  const agencyStats = useMemo(() => {
    if (!filteredBookings || !agencies) return [];

    const statsMap = new Map<string, AgencyStats>();

    filteredBookings.forEach((booking: Booking) => {
      const agency = booking.agencies;
      if (!agency) return;

      const agencyMeta = agencies.find(a => a.id === agency.id);
      const commissionRate = agencyMeta?.commission_rate || 0;
      const existing = statsMap.get(agency.id);
      const isConfirmed = booking.status === "confirmed";
      const amount = booking.total_amount || 0;
      const isUnpaid = booking.status === "pending_payment" || booking.status === "payment_under_review" || booking.status === "draft";

      if (existing) {
        existing.totalBookings++;
        existing.totalRevenue += amount;
        if (isConfirmed) existing.confirmedBookings++;
        existing.averageBookingValue = existing.totalRevenue / existing.totalBookings;
        existing.commissionEarned += amount * (commissionRate / 100);
        if (isUnpaid) existing.outstandingDebt += amount;
        if (booking.booking_type === "package") existing.packageCount++;
        if (booking.booking_type === "flight") existing.flightCount++;
        if (booking.booking_type === "hotel") existing.hotelCount++;
        if (booking.booking_type === "tour") existing.tourCount++;
        if (booking.booking_type === "visa") existing.visaCount++;
      } else {
        statsMap.set(agency.id, {
          agencyId: agency.id,
          agencyName: agency.agency_name,
          totalBookings: 1,
          confirmedBookings: isConfirmed ? 1 : 0,
          totalRevenue: amount,
          averageBookingValue: amount,
          userId: agency.user_id,
          packageCount: booking.booking_type === "package" ? 1 : 0,
          flightCount: booking.booking_type === "flight" ? 1 : 0,
          hotelCount: booking.booking_type === "hotel" ? 1 : 0,
          tourCount: booking.booking_type === "tour" ? 1 : 0,
          visaCount: booking.booking_type === "visa" ? 1 : 0,
          commissionRate,
          commissionEarned: amount * (commissionRate / 100),
          outstandingDebt: isUnpaid ? amount : 0,
        });
      }
    });

    return Array.from(statsMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredBookings, agencies]);

  const top10ByRevenue = agencyStats.slice(0, 10);
  const top10ByBookings = [...agencyStats]
    .sort((a, b) => b.totalBookings - a.totalBookings)
    .slice(0, 10);

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

  const chartData = top10ByRevenue.map((agency, index) => ({
    name: agency.agencyName.length > 15 
      ? agency.agencyName.substring(0, 15) + "..." 
      : agency.agencyName,
    fullName: agency.agencyName,
    revenue: agency.totalRevenue,
    bookings: agency.totalBookings,
    color: COLORS[index % COLORS.length],
  }));

  const pieData = top10ByRevenue.slice(0, 5).map((agency, index) => ({
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
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarRange className="h-5 w-5 text-primary" />
            Date Range Filter
          </CardTitle>
          <CardDescription>
            Filter agency performance by time period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setQuickFilter('thisMonth')}>
                This Month
              </Button>
              <Button size="sm" variant="outline" onClick={() => setQuickFilter('lastMonth')}>
                Last Month
              </Button>
              <Button size="sm" variant="outline" onClick={() => setQuickFilter('last3Months')}>
                Last 3 Months
              </Button>
              <Button size="sm" variant="outline" onClick={() => setQuickFilter('last6Months')}>
                Last 6 Months
              </Button>
              <Button size="sm" variant="outline" onClick={() => setQuickFilter('thisYear')}>
                This Year
              </Button>
              <Button size="sm" variant="outline" onClick={() => setQuickFilter('allTime')}>
                All Time
              </Button>
            </div>
            
            {/* Custom Date Range */}
            <div className="flex items-end gap-3 ml-auto">
              <div>
                <Label className="text-xs">From</Label>
                <DateInput
                  value={dateRange.from}
                  onValueChange={(v) => setDateRange(prev => ({ ...prev, from: v }))}
                  className="w-40"
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <DateInput
                  value={dateRange.to}
                  onValueChange={(v) => setDateRange(prev => ({ ...prev, to: v }))}
                  className="w-40"
                />
              </div>
            </div>
          </div>
          
          {/* Active Range Display */}
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing data from <span className="font-medium text-foreground">{format(parseISO(dateRange.from), 'MMM dd, yyyy')}</span> to{' '}
              <span className="font-medium text-foreground">{format(parseISO(dateRange.to), 'MMM dd, yyyy')}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Active Agencies</p><p className="text-2xl font-bold">{activeAgencies}</p></div><div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">${totalAgencyRevenue.toLocaleString()}</p></div><div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-success" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total Bookings</p><p className="text-2xl font-bold">{totalAgencyBookings}</p></div><div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center"><Package className="h-5 w-5 text-gold" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total Commission</p><p className="text-2xl font-bold text-coral">${Math.round(totalCommission).toLocaleString()}</p></div><div className="h-10 w-10 rounded-xl bg-coral/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-coral" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Outstanding Debt</p><p className="text-2xl font-bold text-amber-600">${totalDebt.toLocaleString()}</p></div><div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center"><DollarSign className="h-5 w-5 text-amber-600" /></div></div></CardContent></Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Top 10 by Revenue */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gold" />
              Top 10 Agencies by Revenue
            </CardTitle>
            <CardDescription>Total revenue generated per agency</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No agency data available for selected period
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 90%)" />
                    <XAxis 
                      type="number" 
                      stroke="hsl(231, 15%, 46%)" 
                      fontSize={12}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="hsl(231, 15%, 46%)" 
                      fontSize={11} 
                      width={120}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(0, 0%, 100%)', 
                        border: '1px solid hsl(240, 6%, 90%)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                      labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="hsl(231, 70%, 30%)" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Revenue Distribution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Revenue Distribution</CardTitle>
            <CardDescription>Top 5 agencies share of total revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No agency data available for selected period
              </div>
            ) : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `$${value.toLocaleString()}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Agency Performance Details
              </CardTitle>
              <CardDescription>Complete breakdown with service types, commission, and debt</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-success hover:bg-success/90" onClick={handleExportExcel} disabled={agencyStats.length === 0}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
              <Button size="sm" variant="outline" onClick={handleExportPDF} disabled={agencyStats.length === 0}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {agencyStats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No agency performance data available for selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Agency</TableHead>
                    <TableHead className="text-center">Bookings</TableHead>
                    <TableHead className="text-center">Confirmed</TableHead>
                    <TableHead className="text-center">Pkg</TableHead>
                    <TableHead className="text-center">Flt</TableHead>
                    <TableHead className="text-center">Htl</TableHead>
                    <TableHead className="text-center">Tour</TableHead>
                    <TableHead className="text-center">Visa</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencyStats.map((agency, index) => (
                    <TableRow key={agency.agencyId}>
                      <TableCell>
                        {index < 3 ? (
                          <Badge className={`${index === 0 ? 'bg-gold text-white' : ''} ${index === 1 ? 'bg-slate-400 text-white' : ''} ${index === 2 ? 'bg-amber-600 text-white' : ''}`}>
                            {index + 1}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {agency.agencyName.charAt(0)}
                          </div>
                          <span className="font-medium text-sm">{agency.agencyName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{agency.totalBookings}</Badge></TableCell>
                      <TableCell className="text-center"><Badge className="bg-success/10 text-success border-success/20">{agency.confirmedBookings}</Badge></TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{agency.packageCount || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{agency.flightCount || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{agency.hotelCount || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{agency.tourCount || "-"}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{agency.visaCount || "-"}</TableCell>
                      <TableCell className="text-right font-semibold text-success">${agency.totalRevenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-coral">${Math.round(agency.commissionEarned).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={agency.outstandingDebt > 0 ? "text-amber-600 font-semibold" : "text-muted-foreground"}>
                          {agency.outstandingDebt > 0 ? `$${agency.outstandingDebt.toLocaleString()}` : "-"}
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
