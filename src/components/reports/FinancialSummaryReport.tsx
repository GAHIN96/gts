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
import { exportToExcel as generateExcel } from "@/utils/excelExport";
import jsPDF from "jspdf";
import { format, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

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
    generateExcel(rows, "Financial_Summary", `Financial_Summary_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportPDF = () => {
    const pdf = new jsPDF("l", "mm", "a4");
    pdf.setFontSize(16); pdf.text("Financial Summary Report", 14, 18);
    pdf.setFontSize(9); pdf.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")} | Revenue: $${totalRevenue.toLocaleString()} | Commission: $${Math.round(totalCommission).toLocaleString()}`, 14, 26);
    pdf.save(`Financial_Summary_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Financial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-8 rounded-3xl border shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-none font-bold text-[10px] uppercase tracking-wider px-2">Financial Insights</Badge>
            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Revenue Audit</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Financial Performance Summary</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Comprehensive breakdown of revenue, commissions, and payment collections.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Button onClick={exportExcel} size="lg" className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
          </Button>
          <Button variant="outline" size="lg" onClick={exportPDF} className="rounded-2xl border-muted bg-card font-bold text-xs uppercase tracking-wider shadow-sm">
            <FileText className="h-4 w-4 mr-2 text-blue-600" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Commission", value: `$${Math.round(totalCommission).toLocaleString()}`, icon: Percent, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Net Revenue", value: `$${Math.round(totalNet).toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Collection Rate", value: `${collectionStats.collectionRate.toFixed(1)}%`, icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50", progress: collectionStats.collectionRate },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-sm bg-card hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1 tracking-tight">{s.value}</p>
                </div>
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", s.bg)}>
                  <s.icon className={cn("h-6 w-6", s.color)} />
                </div>
              </div>
              {s.progress !== undefined && (
                <div className="mt-4">
                  <Progress value={s.progress} className="h-1.5" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Revenue Comparison */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-8 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg font-bold uppercase tracking-tight">Revenue Growth Analysis</CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-wider">Comparison of gross vs settled revenue across previous cycles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="confGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={11} fontWeight={600} tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} fontWeight={600} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  cursor={{ fill: "hsl(var(--muted)/0.1)" }}
                  formatter={(v: number) => `$${v.toLocaleString()}`}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: "11px", fontWeight: "bold" }} />
                <Bar dataKey="revenue" name="Gross Revenue" fill="url(#revGradient)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="confirmed" name="Settled Revenue" fill="url(#confGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Segment Revenue Allocation */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-8 bg-muted/30 border-b">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl font-bold uppercase tracking-tight">Segment Revenue Allocation</CardTitle>
              <CardDescription className="text-sm font-medium">Cross-sector revenue performance and commission yield analysis</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportExcel} className="bg-card font-bold text-xs uppercase tracking-wider">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Export Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDF} className="bg-card font-bold text-xs uppercase tracking-wider">
                <FileText className="h-4 w-4 mr-2 text-blue-600" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground px-8 h-12">Service Category</TableHead>
                  <TableHead className="text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Bookings</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Gross Revenue</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Confirmed Revenue</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Commission</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground pr-8">Net Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueByType.map((d) => (
                  <TableRow key={d.name} className="border-b hover:bg-muted/30 transition-colors">
                    <TableCell className="px-8 py-5 font-bold text-foreground text-sm uppercase">{d.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold bg-muted/60">{d.count}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">${d.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">${d.confirmedRevenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-indigo-600">${Math.round(d.commission).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-foreground pr-8">${Math.round(d.netRevenue).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/20">
                  <TableCell className="px-8 py-6 font-bold text-primary uppercase text-sm tracking-wider">Grand Total</TableCell>
                  <TableCell className="text-center font-bold text-foreground">{revenueByType.reduce((s, d) => s + d.count, 0)}</TableCell>
                  <TableCell className="text-right font-bold text-foreground text-lg">${totalRevenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600 text-lg">${revenueByType.reduce((s, d) => s + d.confirmedRevenue, 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold text-indigo-600 text-lg">${Math.round(totalCommission).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold text-primary pr-8 text-xl">${Math.round(totalNet).toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding by Agency */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-8 bg-muted/30 border-b">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg font-bold">Outstanding Agency Balances</CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-wider">Ranking of agencies by total unpaid amounts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {agencyOutstanding.length === 0 ? (
            <p className="text-center py-20 text-muted-foreground/30 font-bold uppercase tracking-widest">No outstanding data</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="px-8 h-12 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Agency Name</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Total Booked</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Total Paid</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Outstanding</TableHead>
                    <TableHead className="text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground pr-8">Comm. %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencyOutstanding.slice(0, 15).map((a) => (
                    <TableRow key={a.name} className="border-b hover:bg-muted/30 transition-colors">
                      <TableCell className="px-8 py-4 font-bold text-sm">{a.name}</TableCell>
                      <TableCell className="text-right font-bold text-foreground/70">${a.totalBooked.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">${a.totalPaid.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn("text-sm font-bold", a.outstanding > 0 ? "text-rose-600" : "text-emerald-600")}>
                          ${a.outstanding.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center pr-8">
                        <Badge variant="outline" className="font-bold border-muted-foreground/20">{a.commissionRate}%</Badge>
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
