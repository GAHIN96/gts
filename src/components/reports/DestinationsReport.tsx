import { useMemo } from "react";
import { MapPin, TrendingUp, Users, DollarSign, FileSpreadsheet, FileText } from "lucide-react";
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

const COLORS_STATIC = ['hsl(231, 70%, 30%)', 'hsl(6, 100%, 69%)', 'hsl(45, 100%, 51%)', 'hsl(142, 76%, 36%)', 'hsl(270, 70%, 60%)'];

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
  if (b.booking_type === "package") return b.package_departures?.group_packages?.cities?.name || "Unknown";
  if (b.booking_type === "flight") return b.flights?.arrival_city || "Unknown";
  if (b.booking_type === "hotel") return b.hotels?.cities?.name || "Unknown";
  if (b.booking_type === "tour") return b.tours?.cities?.name || "Unknown";
  if (b.booking_type === "visa") return b.visas?.country || "Unknown";
  return "Other";
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

  const exportExcel = () => {
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

  const exportPDF = () => {
    const pdf = new jsPDF("l", "mm", "a4");
    pdf.setFontSize(16);
    pdf.text("Destinations Report", 14, 18);
    pdf.setFontSize(9);
    pdf.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")} | ${destinationStats.length} destinations | Revenue: $${totalRevenue.toLocaleString()}`, 14, 26);
    let y = 36;
    const headers = ["#", "Destination", "Bookings", "Pax", "Revenue", "Confirmed", "Pkg", "Flt", "Htl", "Tour", "Visa"];
    const colW = [10, 35, 20, 15, 25, 25, 15, 15, 15, 15, 15];
    pdf.setFillColor(26, 35, 126);
    pdf.rect(14, y - 5, 205, 8, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    let x = 14;
    headers.forEach((h, i) => { pdf.text(h, x + 1, y); x += colW[i]; });
    y += 6;
    pdf.setTextColor(0, 0, 0);
    destinationStats.slice(0, 30).forEach((d, idx) => {
      if (y > 190) { pdf.addPage(); y = 20; }
      if (idx % 2 === 0) { pdf.setFillColor(245, 245, 245); pdf.rect(14, y - 4, 205, 7, "F"); }
      const row = [String(idx + 1), d.name.substring(0, 20), String(d.bookings), String(d.passengers), `$${d.revenue.toLocaleString()}`, `$${d.confirmedRevenue.toLocaleString()}`, String(d.packageCount), String(d.flightCount), String(d.hotelCount), String(d.tourCount), String(d.visaCount)];
      x = 14;
      row.forEach((c, i) => { pdf.text(c, x + 1, y); x += colW[i]; });
      y += 7;
    });
    pdf.save(`Destinations_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Destinations</p><p className="text-xl font-bold">{destinationStats.length}</p></div><div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><MapPin className="h-5 w-5 text-primary" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold">${totalRevenue.toLocaleString()}</p></div><div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-success" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total Bookings</p><p className="text-xl font-bold">{totalBookings}</p></div><div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-gold" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total Passengers</p><p className="text-xl font-bold">{totalPassengers}</p></div><div className="h-10 w-10 rounded-xl bg-coral/10 flex items-center justify-center"><Users className="h-5 w-5 text-coral" /></div></div></CardContent></Card>
      </div>

      {/* Revenue Bar Chart */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Top Destinations by Revenue</CardTitle>
          <CardDescription>Revenue and booking volume per destination</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No destination data available</p>
          ) : (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: number, name: string) => [
                      name === "revenue" ? `$${value.toLocaleString()}` : value,
                      name === "revenue" ? "Revenue" : "Bookings",
                    ]}
                    labelFormatter={(_, p) => p[0]?.payload?.fullName || ""}
                  />
                  <Bar dataKey="revenue" name="revenue" fill="hsl(231, 70%, 30%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Destination Performance Details</CardTitle>
              <CardDescription>{destinationStats.length} destinations with service breakdown</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-success hover:bg-success/90" onClick={exportExcel} disabled={destinationStats.length === 0}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
              <Button size="sm" variant="outline" onClick={exportPDF} disabled={destinationStats.length === 0}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {destinationStats.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No destination data</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-center">Bookings</TableHead>
                    <TableHead className="text-center">Pax</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Confirmed</TableHead>
                    <TableHead className="text-center">Pkg</TableHead>
                    <TableHead className="text-center">Flt</TableHead>
                    <TableHead className="text-center">Htl</TableHead>
                    <TableHead className="text-center">Tour</TableHead>
                    <TableHead className="text-center">Visa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {destinationStats.map((d, i) => (
                    <TableRow key={d.name}>
                      <TableCell>
                        {i < 3 ? (
                          <Badge className={i === 0 ? "bg-gold text-white" : i === 1 ? "bg-slate-400 text-white" : "bg-amber-600 text-white"}>
                            {i + 1}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{i + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{d.bookings}</Badge></TableCell>
                      <TableCell className="text-center">{d.passengers}</TableCell>
                      <TableCell className="text-right font-semibold">${d.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-success">${d.confirmedRevenue.toLocaleString()}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{d.packageCount || "-"}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{d.flightCount || "-"}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{d.hotelCount || "-"}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{d.tourCount || "-"}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{d.visaCount || "-"}</TableCell>
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
