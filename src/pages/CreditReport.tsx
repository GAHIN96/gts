import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import {
  Building2, Search, Download, ArrowUpRight, ArrowDownRight,
  CreditCard, TrendingUp, AlertTriangle, Wallet, Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToExcel } from "@/utils/excelExport";
import jsPDF from "jspdf";

type Transaction = {
  id: string;
  agency_id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  description: string | null;
  booking_id: string | null;
  created_by: string | null;
  created_at: string;
  agency_name?: string;
};

type AgencySummary = {
  id: string;
  agency_name: string;
  credit_limit: number;
  used_credit: number;
  credit_limit_type: string;
  is_active: boolean;
  totalTransactions: number;
  totalBookingAmount: number;
  totalPayments: number;
  totalAdjustments: number;
  usage: number;
};

function useCreditReportData() {
  return useQuery({
    queryKey: ["credit-report"],
    queryFn: async () => {
      const { data: agencies } = await supabase
        .from("agencies")
        .select("id, agency_name, credit_limit, used_credit, credit_limit_type, is_active");

      const { data: transactions } = await supabase
        .from("agency_credit_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      const agencyMap = new Map(
        (agencies || []).map((a) => [a.id, a.agency_name])
      );

      const enrichedTransactions: Transaction[] = (transactions || []).map((t) => ({
        ...t,
        agency_name: agencyMap.get(t.agency_id) || "Unknown",
      }));

      // Build agency summaries
      const agencySummaries: AgencySummary[] = (agencies || []).map((agency) => {
        const agencyTx = enrichedTransactions.filter((t) => t.agency_id === agency.id);
        const bookingTx = agencyTx.filter((t) => t.transaction_type === "booking");
        const paymentTx = agencyTx.filter((t) => t.transaction_type === "payment");
        const adjustmentTx = agencyTx.filter((t) => t.transaction_type === "adjustment");

        const creditLimit = Number(agency.credit_limit) || 0;
        const usedCredit = Number(agency.used_credit) || 0;

        return {
          id: agency.id,
          agency_name: agency.agency_name,
          credit_limit: creditLimit,
          used_credit: usedCredit,
          credit_limit_type: agency.credit_limit_type || "soft",
          is_active: agency.is_active ?? true,
          totalTransactions: agencyTx.length,
          totalBookingAmount: bookingTx.reduce((sum, t) => sum + Number(t.amount), 0),
          totalPayments: paymentTx.reduce((sum, t) => sum + Number(t.amount), 0),
          totalAdjustments: adjustmentTx.reduce((sum, t) => sum + Number(t.amount), 0),
          usage: creditLimit > 0 ? Math.min(100, (usedCredit / creditLimit) * 100) : 0,
        };
      });

      // Daily credit usage chart (last 30 days)
      const dailyData = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayTx = enrichedTransactions.filter(
          (t) => format(new Date(t.created_at), "yyyy-MM-dd") === dateStr
        );
        return {
          date: format(date, "dd/MM"),
          bookings: dayTx.filter((t) => t.transaction_type === "booking").reduce((s, t) => s + Number(t.amount), 0),
          payments: dayTx.filter((t) => t.transaction_type === "payment").reduce((s, t) => s + Number(t.amount), 0),
          count: dayTx.length,
        };
      });

      // Overall stats
      const totalCreditExtended = agencySummaries.reduce((s, a) => s + a.credit_limit, 0);
      const totalUsed = agencySummaries.reduce((s, a) => s + a.used_credit, 0);
      const overLimitCount = agencySummaries.filter((a) => a.credit_limit > 0 && a.used_credit > a.credit_limit).length;

      return {
        transactions: enrichedTransactions,
        agencySummaries,
        dailyData,
        stats: {
          totalCreditExtended,
          totalUsed,
          totalAvailable: totalCreditExtended - totalUsed,
          overLimitCount,
          totalTransactions: enrichedTransactions.length,
        },
      };
    },
  });
}

const transactionTypeBadge = (type: string) => {
  switch (type) {
    case "booking":
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300"><ArrowUpRight className="h-3 w-3 mr-0.5" />Booking</Badge>;
    case "payment":
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300"><ArrowDownRight className="h-3 w-3 mr-0.5" />Payment</Badge>;
    case "adjustment":
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30"><CreditCard className="h-3 w-3 mr-0.5" />Adjustment</Badge>;
    case "refund":
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30"><ArrowDownRight className="h-3 w-3 mr-0.5" />Refund</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{type}</Badge>;
  }
};

const CreditReport = () => {
  const { data, isLoading } = useCreditReportData();
  const [searchQuery, setSearchQuery] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredTransactions = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.agency_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.booking_id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAgency = agencyFilter === "all" || t.agency_id === agencyFilter;
      const matchesType = typeFilter === "all" || t.transaction_type === typeFilter;
      return matchesSearch && matchesAgency && matchesType;
    });
  }, [data, searchQuery, agencyFilter, typeFilter]);

  const handleExportExcel = () => {
    if (!filteredTransactions.length) return;
    const rows = filteredTransactions.map((t) => ({
      Date: format(new Date(t.created_at), "yyyy-MM-dd HH:mm"),
      Agency: t.agency_name || "",
      Type: t.transaction_type,
      Amount: t.amount,
      "Balance After": t.balance_after,
      Description: t.description || "",
    }));
    exportToExcel(rows, "Credit Transactions", "credit-transactions");
  };

  const handleExportPDF = () => {
    if (!filteredTransactions.length) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Credit Usage Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);
    
    let y = 40;
    doc.setFontSize(8);
    doc.text("Date", 14, y);
    doc.text("Agency", 50, y);
    doc.text("Type", 100, y);
    doc.text("Amount", 130, y);
    doc.text("Balance", 160, y);
    y += 6;
    doc.line(14, y - 2, 196, y - 2);

    filteredTransactions.slice(0, 40).forEach((t) => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(format(new Date(t.created_at), "MM/dd HH:mm"), 14, y);
      doc.text((t.agency_name || "").slice(0, 25), 50, y);
      doc.text(t.transaction_type, 100, y);
      doc.text(`$${Number(t.amount).toLocaleString()}`, 130, y);
      doc.text(`$${Number(t.balance_after).toLocaleString()}`, 160, y);
      y += 5;
    });

    doc.save("credit-report.pdf");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const { stats, agencySummaries, dailyData } = data || {
    stats: { totalCreditExtended: 0, totalUsed: 0, totalAvailable: 0, overLimitCount: 0, totalTransactions: 0 },
    agencySummaries: [],
    dailyData: [],
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Credit Usage Report</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-xs">
            <Download className="h-3.5 w-3.5 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="text-xs">
            <Download className="h-3.5 w-3.5 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">${stats.totalCreditExtended.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">Total Credit Extended</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <TrendingUp className="h-4.5 w-4.5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">${stats.totalUsed.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">Total Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CreditCard className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">${stats.totalAvailable.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">Available Credit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.overLimitCount}</p>
                <p className="text-[11px] text-muted-foreground">Over Limit</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Credit Usage Trend */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Credit Activity (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="bookings" fill="hsl(var(--chart-2))" name="Bookings" radius={[3, 3, 0, 0]} />
                <Bar dataKey="payments" fill="hsl(var(--primary))" name="Payments" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Agency Credit Usage */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Agency Credit Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agencySummaries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No agencies found</p>
            )}
            {agencySummaries.slice(0, 6).map((agency) => (
              <div key={agency.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate max-w-[140px]">{agency.agency_name}</span>
                  <span className="text-muted-foreground">
                    ${agency.used_credit.toLocaleString()} / ${agency.credit_limit.toLocaleString() || "∞"}
                  </span>
                </div>
                <Progress
                  value={agency.usage}
                  className="h-1.5"
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{agency.totalTransactions} txns</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {agency.credit_limit_type}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Transaction History
              <Badge variant="secondary" className="text-[10px] ml-1">{filteredTransactions.length}</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs w-48"
                />
              </div>
              <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue placeholder="All Agencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agencies</SelectItem>
                  {agencySummaries.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.agency_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 text-xs w-32">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-[11px] font-semibold h-9">Date</TableHead>
                  <TableHead className="text-[11px] font-semibold h-9">Agency</TableHead>
                  <TableHead className="text-[11px] font-semibold h-9">Type</TableHead>
                  <TableHead className="text-[11px] font-semibold h-9">Amount</TableHead>
                  <TableHead className="text-[11px] font-semibold h-9">Balance After</TableHead>
                  <TableHead className="text-[11px] font-semibold h-9">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      No credit transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs py-2.5">
                        {format(new Date(tx.created_at), "dd/MM/yyyy")}
                        <br />
                        <span className="text-muted-foreground text-[10px]">
                          {format(new Date(tx.created_at), "HH:mm")}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-medium py-2.5">{tx.agency_name}</TableCell>
                      <TableCell className="py-2.5">{transactionTypeBadge(tx.transaction_type)}</TableCell>
                      <TableCell className="text-xs font-semibold py-2.5">
                        <span className={tx.transaction_type === "payment" || tx.transaction_type === "refund" ? "text-emerald-600" : "text-amber-600"}>
                          {tx.transaction_type === "payment" || tx.transaction_type === "refund" ? "-" : "+"}
                          ${Number(tx.amount).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-2.5 text-muted-foreground">${Number(tx.balance_after).toLocaleString()}</TableCell>
                      <TableCell className="text-xs py-2.5 text-muted-foreground max-w-[200px] truncate">
                        {tx.description || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditReport;
