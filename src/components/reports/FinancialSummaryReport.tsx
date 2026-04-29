import { useMemo } from "react";
import { DollarSign, TrendingUp, CreditCard, Percent, FileSpreadsheet, FileText, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { type Booking } from "@/hooks/useBookings";
import { usePayments } from "@/hooks/usePayments";
import { useAgencies } from "@/hooks/useAgencies";
import { exportToExcel } from "@/utils/excelExport";
import jsPDF from "jspdf";
import { format, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth, subMonths } from "date-fns";

export function FinancialSummaryReport({ bookings }: { bookings: Booking[] }) {
  const { data: payments } = usePayments();
  const { data: agencies } = useAgencies();

  // Revenue by booking type
  const revenueByType = useMemo(() => {
    const types = ["package", "flight", "hotel", "tour", "visa"];
    return types.map((t) => {
      const typeBookings = bookings.filter((b) => b.booking_type === t);
      const revenue = typeBookings.reduce((s, b) => s + b.total_amount, 0);
      const confirmedRev = typeBookings.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.total_amount, 0);
      const commissionEst = agencies?.reduce((sum, a) => {
        const agencyBookings = typeBookings.filter((b) => b.agencies?.id === a.id);
        return sum + agencyBookings.reduce((s, b) => s + b.total_amount * ((a.commission_rate || 0) / 100), 0);
      }, 0) || 0;
      return { name: t.charAt(0).toUpperCase() + t.slice(1), revenue, confirmedRevenue: confirmedRev, commission: commissionEst, netRevenue: revenue - commissionEst, count: typeBookings.length };
    }).filter((d) => d.count > 0);
  }, [bookings, agencies]);

  // Payment collection stats
  const collectionStats = useMemo(() => {
    if (!payments) return { totalInvoiced: 0, totalCollected: 0, totalPending: 0, collectionRate: 0 };
    const totalInvoiced = bookings.reduce((s, b) => s + b.total_amount, 0);
    const totalCollected = payments.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0);
    const totalPending = payments.filter((p) => p.status === "proof_uploaded" || p.status === "unpaid").reduce((s, p) => s + p.amount, 0);
    const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;
    return { totalInvoiced, totalCollected, totalPending, collectionRate };
  }, [bookings, payments]);

  // Outstanding by agency
  const agencyOutstanding = useMemo(() => {
    if (!agencies || !payments) return [];
    return agencies.map((a) => {
      const agencyBookings = bookings.filter((b) => b.agencies?.id === a.id);
      const totalBooked = agencyBookings.reduce((s, b) => s + b.total_amount, 0);
      const paidPayments = payments.filter((p) => p.status === "approved" && agencyBookings.some((b) => b.id === p.bookings?.id));
      const totalPaid = paidPayments.reduce((s, p) => s + p.amount, 0);
      const outstanding = totalBooked - totalPaid;
      return { name: a.agency_name, totalBooked, totalPaid, outstanding, commissionRate: a.commission_rate || 0 };
    }).filter((a) => a.totalBooked > 0).sort((a, b) => b.outstanding - a.outstanding);
  }, [bookings, agencies, payments]);

  // Monthly comparison
  const monthlyComparison = useMemo(() => {
    const months = eachMonthOfInterval({ start: startOfMonth(subMonths(new Date(), 5)), end: new Date() });
    return months.map((m) => {
      const ms = startOfMonth(m);
      const me = endOfMonth(m);
      const mb = bookings.filter((b) => {
        try { const d = parseISO(b.created_at || ""); return d >= ms && d <= me; } catch { return false; }
      });
      const revenue = mb.reduce((s, b) => s + b.total_amount, 0);
      const confirmed = mb.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.total_amount, 0);
      return { month: format(m, "MMM"), revenue, confirmed, count: mb.length };
    });
  }, [bookings]);

  const totalRevenue = revenueByType.reduce((s, d) => s + d.revenue, 0);
  const totalCommission = revenueByType.reduce((s, d) => s + d.commission, 0);
  const totalNet = totalRevenue - totalCommission;

  const exportExcel = () => {
    const rows = revenueByType.map((d) => ({
      Type: d.name, Bookings: d.count, "Revenue ($)": d.revenue, "Confirmed ($)": d.confirmedRevenue,
      "Commission ($)": Math.round(d.commission), "Net Revenue ($)": Math.round(d.netRevenue),
    }));
    exportToExcel(rows, "Financial_Summary", `Financial_Summary_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportPDF = () => {
    const pdf = new jsPDF("l", "mm", "a4");
    pdf.setFontSize(16); pdf.text("Financial Summary Report", 14, 18);
    pdf.setFontSize(9); pdf.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")} | Revenue: $${totalRevenue.toLocaleString()} | Commission: $${Math.round(totalCommission).toLocaleString()}`, 14, 26);
    pdf.save(`Financial_Summary_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold">${totalRevenue.toLocaleString()}</p></div><div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Est. Commission</p><p className="text-xl font-bold text-coral">${Math.round(totalCommission).toLocaleString()}</p></div><div className="h-10 w-10 rounded-xl bg-coral/10 flex items-center justify-center"><Percent className="h-5 w-5 text-coral" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Net Revenue</p><p className="text-xl font-bold text-success">${Math.round(totalNet).toLocaleString()}</p></div><div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-success" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Collection Rate</p><p className="text-xl font-bold">{collectionStats.collectionRate.toFixed(1)}%</p><Progress value={collectionStats.collectionRate} className="h-1.5 mt-2" /></div><div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center"><CreditCard className="h-5 w-5 text-gold" /></div></div></CardContent></Card>
      </div>

      {/* Monthly Revenue Comparison */}
      <Card className="shadow-card">
        <CardHeader><CardTitle>Monthly Revenue Comparison</CardTitle><CardDescription>Revenue and confirmed amounts over the last 6 months</CardDescription></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: "8px" }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" name="Total Revenue" fill="hsl(231, 70%, 30%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="confirmed" name="Confirmed" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Type Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div><CardTitle>Revenue vs Commission by Type</CardTitle><CardDescription>Breakdown per booking category</CardDescription></div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-success hover:bg-success/90" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
              <Button size="sm" variant="outline" onClick={exportPDF}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead><TableHead className="text-center">Bookings</TableHead>
                  <TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Confirmed</TableHead>
                  <TableHead className="text-right">Commission</TableHead><TableHead className="text-right">Net Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueByType.map((d) => (
                  <TableRow key={d.name}>
                    <TableCell className="font-medium capitalize">{d.name}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline">{d.count}</Badge></TableCell>
                    <TableCell className="text-right">${d.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-success">${d.confirmedRevenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-coral">${Math.round(d.commission).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">${Math.round(d.netRevenue).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{revenueByType.reduce((s, d) => s + d.count, 0)}</TableCell>
                  <TableCell className="text-right">${totalRevenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-success">${revenueByType.reduce((s, d) => s + d.confirmedRevenue, 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-coral">${Math.round(totalCommission).toLocaleString()}</TableCell>
                  <TableCell className="text-right">${Math.round(totalNet).toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding by Agency */}
      <Card className="shadow-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Outstanding by Agency</CardTitle><CardDescription>Unpaid amounts per agency</CardDescription></CardHeader>
        <CardContent>
          {agencyOutstanding.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No outstanding data</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Agency</TableHead><TableHead className="text-right">Total Booked</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead><TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-center">Commission %</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {agencyOutstanding.slice(0, 15).map((a) => (
                    <TableRow key={a.name}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-right">${a.totalBooked.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-success">${a.totalPaid.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={a.outstanding > 0 ? "text-amber-600 font-semibold" : "text-success"}>
                          ${a.outstanding.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{a.commissionRate}%</Badge></TableCell>
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
