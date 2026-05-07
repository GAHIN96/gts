import { useMemo } from "react";
import { MapPin, TrendingUp, Users, DollarSign, FileSpreadsheet, FileText, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { type Booking } from "@/hooks/useBookings";
import { exportToExcel } from "@/utils/excelExport";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DestinationStats {
  name: string;
  revenue: number;
  bookings: number;
  passengers: number;
  confirmedRevenue: number;
  packageCount: number;
  flightCount: number;
  hotelCount: number;
  tourCount: number;
  visaCount: number;
}

function getDestination(b: Booking): string {
  if (b.booking_type === "package") return b.package_departures?.group_packages?.cities?.name || "Global Destination";
  if (b.booking_type === "flight") return b.flights?.arrival_city || "Global Destination";
  if (b.booking_type === "hotel") return b.hotels?.cities?.name || "Global Destination";
  if (b.booking_type === "tour") return b.tours?.cities?.name || "Global Destination";
  if (b.booking_type === "visa") return b.visas?.country || "Global Destination";
  return "Operational Zone";
}

export function DestinationsReport({ bookings }: { bookings: Booking[] }) {
  const destinationStats = useMemo(() => {
    const map = new Map<string, DestinationStats>();
    bookings.forEach((b) => {
      const dest = getDestination(b);
      const existing = map.get(dest) || {
        name: dest, revenue: 0, bookings: 0, passengers: 0, confirmedRevenue: 0,
        packageCount: 0, flightCount: 0, hotelCount: 0, tourCount: 0, visaCount: 0,
      };
      existing.revenue += b.total_amount || 0;
      existing.bookings += 1;
      existing.passengers += b.passengers || 1;
      if (b.status === "confirmed") existing.confirmedRevenue += b.total_amount || 0;
      if (b.booking_type === "package") existing.packageCount++;
      if (b.booking_type === "flight") existing.flightCount++;
      if (b.booking_type === "hotel") existing.hotelCount++;
      if (b.booking_type === "tour") existing.tourCount++;
      if (b.booking_type === "visa") existing.visaCount++;
      map.set(dest, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [bookings]);

  const top10 = destinationStats.slice(0, 10);
  const totalRevenue = destinationStats.reduce((s, d) => s + d.revenue, 0);
  const totalBookings = destinationStats.reduce((s, d) => s + d.bookings, 0);
  const totalPassengers = destinationStats.reduce((s, d) => s + d.passengers, 0);

  const chartData = top10.map((d) => ({
    name: d.name.length > 12 ? d.name.substring(0, 12) + "..." : d.name,
    fullName: d.name,
    revenue: d.revenue,
    bookings: d.bookings,
  }));

  const handleExportExcel = () => {
    const rows = destinationStats.map((d, i) => ({
      "#": i + 1,
      Destination: d.name,
      "Total Bookings": d.bookings,
      Passengers: d.passengers,
      "Total Revenue ($)": d.revenue,
      "Confirmed Revenue ($)": d.confirmedRevenue,
      Packages: d.packageCount,
      Flights: d.flightCount,
      Hotels: d.hotelCount,
      Tours: d.tourCount,
      Visas: d.visaCount,
    }));
    exportToExcel(rows, "Destinations", `Destinations_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const handleExportPDF = () => {
    const pdf = new jsPDF("l", "mm", "a4");
    pdf.setFontSize(16); pdf.text("Regional Performance Report", 14, 18);
    pdf.setFontSize(9);
    pdf.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")} | ${destinationStats.length} regions | Revenue: $${totalRevenue.toLocaleString()}`, 14, 26);
    pdf.save(`Destinations_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ═══════ REGIONAL ANALYTICS HEADER ═══════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-8 rounded-3xl border shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold text-[10px] uppercase tracking-wider px-2">Location Intelligence</Badge>
            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Reach</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Regional Destination Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Performance breakdown and revenue concentration by destination and region.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Button onClick={handleExportExcel} size="lg" className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="lg" onClick={handleExportPDF} className="rounded-2xl border-muted bg-card font-bold text-xs uppercase tracking-wider shadow-sm">
            <FileText className="h-4 w-4 mr-2 text-blue-600" /> PDF
          </Button>
        </div>
      </div>

      {/* Destination KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: Globe, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active Destinations", value: destinationStats.length.toString(), icon: MapPin, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Total Bookings", value: totalBookings.toString(), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Passengers", value: totalPassengers.toString(), icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm bg-card hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-8">
              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground tracking-tight tabular-nums">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Value Concentration Chart */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-8 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg font-bold uppercase tracking-tight">Destination Revenue Distribution</CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-wider">Top regions ranked by total revenue output</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} fontWeight={600} tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} fontWeight={600} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Regional Performance Details Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-8 bg-muted/30 border-b">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl font-bold uppercase tracking-tight">Regional Performance Ledger</CardTitle>
              <CardDescription className="text-sm font-medium">Comparative analysis of destination-specific performance metrics</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="bg-card font-bold text-xs uppercase tracking-wider" disabled={destinationStats.length === 0}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="w-20 text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground px-8">Rank</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Destination Region</TableHead>
                  <TableHead className="text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Bookings</TableHead>
                  <TableHead className="text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Pax</TableHead>
                  <TableHead className="text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground">PKG</TableHead>
                  <TableHead className="text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground">FLT</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Total Revenue</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground pr-8">Market Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {destinationStats.map((d, index) => (
                  <TableRow key={d.name} className="hover:bg-muted/30 transition-colors border-b last:border-none group">
                    <TableCell className="text-center px-8">
                      <span className={`inline-flex items-center justify-center h-7 w-7 rounded-lg text-xs font-bold ${index < 3 ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"}`}>
                        {index + 1}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-foreground text-sm uppercase">{d.name}</span>
                    </TableCell>
                    <TableCell className="text-center font-bold text-foreground/70">{d.bookings}</TableCell>
                    <TableCell className="text-center font-bold text-muted-foreground/60">{d.passengers}</TableCell>
                    <TableCell className="text-center text-[11px] font-bold text-muted-foreground">{d.packageCount || "-"}</TableCell>
                    <TableCell className="text-center text-[11px] font-bold text-muted-foreground">{d.flightCount || "-"}</TableCell>
                    <TableCell className="text-right font-bold text-foreground tracking-tight">${d.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-[11px] font-bold text-muted-foreground">{Math.round((d.revenue / totalRevenue) * 100)}%</span>
                        <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${(d.revenue / destinationStats[0].revenue) * 100}%` }} />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
