import { useMemo } from "react";
import { AlertTriangle, Clock, DollarSign, Building2, FileSpreadsheet, FileText, CalendarClock } from "lucide-react";
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
import { useAgencies } from "@/hooks/useAgencies";
import { exportToExcel } from "@/utils/excelExport";
import jsPDF from "jspdf";
import { format, differenceInDays, parseISO } from "date-fns";

interface AgencyDebt {
  name: string;
  agencyId: string;
  current: number;
  over30: number;
  over60: number;
  over90: number;
  total: number;
  overdueBookings: number;
  creditLimit: number;
  usedCredit: number;
}

export function DebtsAgingReport({ bookings }: { bookings: Booking[] }) {
  const { data: agencies } = useAgencies();
  const now = new Date();

  // Calculate aging per agency
  const agencyDebts = useMemo(() => {
    if (!agencies) return [];

    return agencies.map((agency) => {
      const agencyBookings = bookings.filter((b) => b.agencies?.id === agency.id);
      const unpaidBookings = agencyBookings.filter(
        (b) => b.status === "pending_payment" || b.status === "payment_under_review" || b.status === "draft"
      );

      let current = 0, over30 = 0, over60 = 0, over90 = 0, overdueCount = 0;
      unpaidBookings.forEach((b) => {
        const days = differenceInDays(now, parseISO(b.created_at || new Date().toISOString()));
        const amt = b.total_amount || 0;
        if (days > 90) { over90 += amt; overdueCount++; }
        else if (days > 60) { over60 += amt; overdueCount++; }
        else if (days > 30) { over30 += amt; overdueCount++; }
        else { current += amt; }
      });

      const total = current + over30 + over60 + over90;
      return {
        name: agency.agency_name,
        agencyId: agency.id,
        current, over30, over60, over90, total,
        overdueBookings: overdueCount,
        creditLimit: Number(agency.credit_limit) || 0,
        usedCredit: Number(agency.used_credit) || 0,
      } as AgencyDebt;
    }).filter((a) => a.total > 0).sort((a, b) => b.total - a.total);
  }, [bookings, agencies]);

  // Overdue bookings list
  const overdueBookings = useMemo(() => {
    return bookings
      .filter((b) => b.status === "pending_payment" || b.status === "payment_under_review")
      .map((b) => ({
        ...b,
        daysPending: differenceInDays(now, parseISO(b.created_at || new Date().toISOString())),
      }))
      .filter((b) => b.daysPending > 7)
      .sort((a, b) => b.daysPending - a.daysPending);
  }, [bookings]);

  const totalDebt = agencyDebts.reduce((s, a) => s + a.total, 0);
  const totalCurrent = agencyDebts.reduce((s, a) => s + a.current, 0);
  const totalOver30 = agencyDebts.reduce((s, a) => s + a.over30, 0);
  const totalOver60 = agencyDebts.reduce((s, a) => s + a.over60, 0);
  const totalOver90 = agencyDebts.reduce((s, a) => s + a.over90, 0);

  const agingChartData = agencyDebts.slice(0, 8).map((a) => ({
    name: a.name.length > 12 ? a.name.substring(0, 12) + "..." : a.name,
    Current: a.current,
    "30+ Days": a.over30,
    "60+ Days": a.over60,
    "90+ Days": a.over90,
  }));

  const exportExcel = () => {
    const rows = agencyDebts.map((a, i) => ({
      "#": i + 1,
      Agency: a.name,
      "Current ($)": a.current,
      "30+ Days ($)": a.over30,
      "60+ Days ($)": a.over60,
      "90+ Days ($)": a.over90,
      "Total Debt ($)": a.total,
      "Overdue Bookings": a.overdueBookings,
      "Credit Limit ($)": a.creditLimit,
      "Used Credit ($)": a.usedCredit,
    }));
    exportToExcel(rows, "Debts_Aging", `Debts_Aging_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportPDF = () => {
    const pdf = new jsPDF("l", "mm", "a4");
    pdf.setFontSize(16); pdf.text("Debts & Aging Report", 14, 18);
    pdf.setFontSize(9); pdf.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")} | Total Outstanding: $${totalDebt.toLocaleString()}`, 14, 26);
    let y = 36;
    const headers = ["#", "Agency", "Current", "30+ Days", "60+ Days", "90+ Days", "Total", "Overdue"];
    const colW = [10, 45, 25, 25, 25, 25, 25, 20];
    pdf.setFillColor(26, 35, 126); pdf.rect(14, y - 5, 200, 8, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(7);
    let x = 14;
    headers.forEach((h, i) => { pdf.text(h, x + 1, y); x += colW[i]; });
    y += 6; pdf.setTextColor(0, 0, 0);
    agencyDebts.slice(0, 30).forEach((a, idx) => {
      if (y > 190) { pdf.addPage(); y = 20; }
      if (idx % 2 === 0) { pdf.setFillColor(245, 245, 245); pdf.rect(14, y - 4, 200, 7, "F"); }
      const row = [String(idx + 1), a.name.substring(0, 25), `$${a.current.toLocaleString()}`, `$${a.over30.toLocaleString()}`, `$${a.over60.toLocaleString()}`, `$${a.over90.toLocaleString()}`, `$${a.total.toLocaleString()}`, String(a.overdueBookings)];
      x = 14; row.forEach((c, i) => { pdf.text(c, x + 1, y); x += colW[i]; }); y += 7;
    });
    pdf.save(`Debts_Aging_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Aging Summary Cards - Professional BI Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Outstanding", value: `$${totalDebt.toLocaleString()}`, icon: DollarSign, color: "text-primary", bg: "bg-primary/5" },
          { label: "Current Cycle", value: `$${totalCurrent.toLocaleString()}`, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "30+ Days Overdue", value: `$${totalOver30.toLocaleString()}`, icon: Clock3, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "60+ Days Overdue", value: `$${totalOver60.toLocaleString()}`, icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "90+ Days Critical", value: `$${totalOver90.toLocaleString()}`, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/5" },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Aging Analysis Chart */}
      {agingChartData.length > 0 && (
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-2 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg font-bold">Aging Distribution Analysis</CardTitle>
                <CardDescription className="text-xs">Breakdown of outstanding balance by aging category</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={11} fontWeight={500} axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} fontWeight={500} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    itemStyle={{ fontWeight: "bold", fontSize: "12px" }}
                    cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                    formatter={(v: number) => `$${v.toLocaleString()}`}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: "11px", fontWeight: "600" }} />
                  <Bar dataKey="Current" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="30+ Days" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="60+ Days" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="90+ Days" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liability Rankings Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="pb-6 bg-muted/30 border-b">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl font-bold">Liability & Credit Analysis</CardTitle>
              <CardDescription className="text-sm font-medium">{agencyDebts.length} active agency accounts with outstanding balances</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-background font-semibold" onClick={exportExcel} disabled={agencyDebts.length === 0}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Export Excel
              </Button>
              <Button variant="outline" size="sm" className="bg-background font-semibold" onClick={exportPDF} disabled={agencyDebts.length === 0}>
                <FileText className="h-4 w-4 mr-2 text-blue-600" /> Download PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {agencyDebts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40">
              <Building2 className="h-12 w-12 mb-3" />
              <p className="font-semibold text-sm uppercase tracking-wider">No active liabilities found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-16 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">Rank</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Agency Name</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Current</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">30+ Days</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">60+ Days</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">90+ Days</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Total Balance</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">Orders</TableHead>
                    <TableHead className="w-48 font-bold text-xs uppercase tracking-wider text-muted-foreground">Credit Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencyDebts.map((a, i) => {
                    const usage = a.creditLimit > 0 ? (a.usedCredit / a.creditLimit) * 100 : 0;
                    return (
                      <TableRow key={a.agencyId} className={cn("hover:bg-muted/30 transition-colors border-b", a.over90 > 0 ? "bg-red-50/30" : a.over60 > 0 ? "bg-orange-50/30" : "")}>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center justify-center h-7 w-7 rounded-lg text-xs font-bold ${i === 0 ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"}`}>
                            {i + 1}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-sm">{a.name}</TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground">${a.current.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-600">{a.over30 > 0 ? `$${a.over30.toLocaleString()}` : "-"}</TableCell>
                        <TableCell className="text-right font-bold text-orange-600">{a.over60 > 0 ? `$${a.over60.toLocaleString()}` : "-"}</TableCell>
                        <TableCell className="text-right font-bold text-destructive text-base">{a.over90 > 0 ? `$${a.over90.toLocaleString()}` : "-"}</TableCell>
                        <TableCell className="text-right font-bold text-foreground text-base">${a.total.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-bold bg-muted/60">{a.overdueBookings}</Badge>
                        </TableCell>
                        <TableCell>
                          {a.creditLimit > 0 ? (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                                <span className="text-muted-foreground">Usage</span>
                                <span className={cn(usage > 90 ? "text-destructive" : usage > 70 ? "text-amber-600" : "text-primary")}>{usage.toFixed(0)}%</span>
                              </div>
                              <Progress value={Math.min(usage, 100)} className="h-1.5 bg-muted" />
                            </div>
                          ) : <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest italic">N/A</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Critical Overdue Section */}
      {overdueBookings.length > 0 && (
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-amber-50/50 border-b border-amber-100">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <CardTitle className="text-lg font-bold text-amber-900 uppercase tracking-tight">Critical Overdue Monitoring</CardTitle>
                <CardDescription className="text-xs text-amber-700 font-medium">{overdueBookings.length} bookings exceeding standard payment window ({">"}7 days)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-amber-50/20">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-amber-800/60 px-8">Booking #</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-amber-800/60">Agency</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-amber-800/60">Type</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-amber-800/60">Amount</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-amber-800/60">Days Pending</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-amber-800/60 pr-8">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueBookings.slice(0, 15).map((b) => (
                    <TableRow key={b.id} className={cn("hover:bg-amber-50/30 transition-colors border-b border-amber-100/50", b.daysPending > 60 ? "bg-red-50/20" : "")}>
                      <TableCell className="px-8 font-sans font-medium text-xs font-bold text-primary">{b.booking_number}</TableCell>
                      <TableCell className="text-sm font-semibold">{b.agencies?.agency_name || "Direct Booking"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] font-bold uppercase">{b.booking_type}</Badge></TableCell>
                      <TableCell className="text-right font-bold">${b.total_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "font-bold text-[10px] rounded-md",
                          b.daysPending > 90 ? "bg-red-600 text-white" : b.daysPending > 60 ? "bg-orange-500 text-white" : b.daysPending > 30 ? "bg-amber-500 text-white" : "bg-blue-100 text-blue-700"
                        )}>
                          {b.daysPending} DAYS
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8 text-xs font-medium text-muted-foreground">{b.created_at ? format(parseISO(b.created_at), "MMM dd, yyyy") : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {overdueBookings.length > 15 && (
                <div className="p-4 text-center bg-muted/10 border-t">
                  <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Showing top 15 critical items of {overdueBookings.length}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
