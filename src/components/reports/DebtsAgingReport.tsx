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
      {/* Aging Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="shadow-card"><CardContent className="p-5"><div><p className="text-xs text-muted-foreground">Total Outstanding</p><p className="text-xl font-bold text-destructive">${totalDebt.toLocaleString()}</p></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div><p className="text-xs text-muted-foreground">Current</p><p className="text-xl font-bold">${totalCurrent.toLocaleString()}</p></div></CardContent></Card>
        <Card className="shadow-card border-amber-200"><CardContent className="p-5"><div><p className="text-xs text-muted-foreground">30+ Days</p><p className="text-xl font-bold text-amber-600">${totalOver30.toLocaleString()}</p></div></CardContent></Card>
        <Card className="shadow-card border-orange-200"><CardContent className="p-5"><div><p className="text-xs text-muted-foreground">60+ Days</p><p className="text-xl font-bold text-orange-600">${totalOver60.toLocaleString()}</p></div></CardContent></Card>
        <Card className="shadow-card border-destructive/30"><CardContent className="p-5"><div><p className="text-xs text-muted-foreground">90+ Days</p><p className="text-xl font-bold text-destructive">${totalOver90.toLocaleString()}</p></div></CardContent></Card>
      </div>

      {/* Aging Stacked Bar Chart */}
      {agingChartData.length > 0 && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" />Debt Aging by Agency</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: "8px" }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="Current" stackId="a" fill="hsl(231, 70%, 30%)" />
                  <Bar dataKey="30+ Days" stackId="a" fill="hsl(45, 100%, 51%)" />
                  <Bar dataKey="60+ Days" stackId="a" fill="hsl(25, 95%, 53%)" />
                  <Bar dataKey="90+ Days" stackId="a" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agency Debt Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Agency Debt Rankings</CardTitle><CardDescription>{agencyDebts.length} agencies with outstanding balances</CardDescription></div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-success hover:bg-success/90" onClick={exportExcel} disabled={agencyDebts.length === 0}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
              <Button size="sm" variant="outline" onClick={exportPDF} disabled={agencyDebts.length === 0}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {agencyDebts.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No outstanding debts found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-10">#</TableHead><TableHead>Agency</TableHead>
                  <TableHead className="text-right">Current</TableHead><TableHead className="text-right">30+ Days</TableHead>
                  <TableHead className="text-right">60+ Days</TableHead><TableHead className="text-right">90+ Days</TableHead>
                  <TableHead className="text-right">Total Debt</TableHead><TableHead className="text-center">Overdue</TableHead>
                  <TableHead>Credit Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {agencyDebts.map((a, i) => {
                    const usage = a.creditLimit > 0 ? (a.usedCredit / a.creditLimit) * 100 : 0;
                    return (
                      <TableRow key={a.agencyId} className={a.over90 > 0 ? "bg-destructive/5" : a.over60 > 0 ? "bg-orange-50" : ""}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-right">${a.current.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-amber-600">{a.over30 > 0 ? `$${a.over30.toLocaleString()}` : "-"}</TableCell>
                        <TableCell className="text-right text-orange-600">{a.over60 > 0 ? `$${a.over60.toLocaleString()}` : "-"}</TableCell>
                        <TableCell className="text-right text-destructive font-semibold">{a.over90 > 0 ? `$${a.over90.toLocaleString()}` : "-"}</TableCell>
                        <TableCell className="text-right font-bold">${a.total.toLocaleString()}</TableCell>
                        <TableCell className="text-center"><Badge variant={a.overdueBookings > 0 ? "destructive" : "outline"}>{a.overdueBookings}</Badge></TableCell>
                        <TableCell>
                          {a.creditLimit > 0 ? (
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <Progress value={Math.min(usage, 100)} className="h-1.5 flex-1" />
                              <span className="text-[10px] text-muted-foreground">{usage.toFixed(0)}%</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">No limit</span>}
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

      {/* Overdue Bookings */}
      <Card className="shadow-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Overdue Bookings ({">"}7 days)</CardTitle><CardDescription>{overdueBookings.length} bookings pending payment for over 7 days</CardDescription></CardHeader>
        <CardContent>
          {overdueBookings.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No overdue bookings</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Booking #</TableHead><TableHead>Agency</TableHead><TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead><TableHead className="text-center">Days Pending</TableHead>
                  <TableHead>Status</TableHead><TableHead>Created</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {overdueBookings.slice(0, 25).map((b) => (
                    <TableRow key={b.id} className={b.daysPending > 90 ? "bg-destructive/5" : b.daysPending > 60 ? "bg-orange-50" : ""}>
                      <TableCell className="font-mono text-sm">{b.booking_number}</TableCell>
                      <TableCell>{b.agencies?.agency_name || "N/A"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{b.booking_type}</Badge></TableCell>
                      <TableCell className="text-right font-medium">${b.total_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={b.daysPending > 90 ? "bg-destructive text-white" : b.daysPending > 60 ? "bg-orange-500 text-white" : b.daysPending > 30 ? "bg-amber-500 text-white" : "bg-muted"}>
                          {b.daysPending}d
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">{(b.status || "").replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.created_at ? format(parseISO(b.created_at), "dd/MM/yyyy") : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {overdueBookings.length > 25 && <p className="text-sm text-muted-foreground text-center mt-3">Showing first 25 of {overdueBookings.length} overdue bookings</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
