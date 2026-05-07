import { useState, useMemo, Fragment, createContext, useContext } from "react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, parseISO, isWithinInterval, startOfDay, endOfDay, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, AlertTriangle, Building2, Clock,
  CheckCircle, ArrowUpRight, ArrowDownRight, Wallet, PieChart,
  Search, Download, Filter, FileSpreadsheet, FileText, Printer,
  Package, PlaneTakeoff, Hotel, Compass, Stamp, Trophy, X,
  ChevronDown, ChevronRight, Users, Eye, ExternalLink, User, Mail, Phone, Receipt,
  XCircle, Ticket, Loader2, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from "recharts";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { usePayments, useApprovePayment, useRejectPayment, type Payment } from "@/hooks/usePayments";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UniversalVoucher, type VoucherType } from "@/components/booking/UniversalVoucher";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { exportToExcel as generateExcel } from "@/utils/excelExport";
import jsPDF from "jspdf";
import { toast } from "sonner";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5, 280 65% 60%))"];
const TYPE_COLORS: Record<string, string> = {
  package: "hsl(var(--primary))",
  flight: "hsl(var(--chart-2))",
  hotel: "hsl(var(--chart-3))",
  tour: "hsl(var(--chart-4))",
  visa: "hsl(var(--chart-5, 280 65% 60%))",
};
const TYPE_ICONS: Record<string, any> = { package: Package, flight: PlaneTakeoff, hotel: Hotel, tour: Compass, visa: Stamp };

// ── Date Range Context ──
type DateRange = { from: Date | undefined; to: Date | undefined };
const DateRangeContext = createContext<DateRange>({ from: undefined, to: undefined });
const useDateRange = () => useContext(DateRangeContext);

function isInDateRange(dateStr: string | null | undefined, range: DateRange): boolean {
  if (!range.from && !range.to) return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (range.from && range.to) return isWithinInterval(d, { start: startOfDay(range.from), end: endOfDay(range.to) });
  if (range.from) return d >= startOfDay(range.from);
  if (range.to) return d <= endOfDay(range.to);
  return true;
}

// ── Currency helper ──
function useCurrency() {
  const { settings } = useCompanySettings();
  // Try to extract currency from settings or default to USD
  const currency = (settings as any)?.currency || "USD";
  const symbol = currency === "IQD" ? "IQD " : currency === "EUR" ? "€" : "$";
  return { currency, symbol, fmt: (n: number) => `${symbol}${n.toLocaleString()}` };
}

// ── Finance Stats Hook (Dashboard + Debts) ──
function useFinanceStats(dateRange: DateRange) {
  return useQuery({
    queryKey: ["finance-stats", dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, total_amount, status, created_at, user_id, booking_type");
      const { data: payments } = await supabase
        .from("payments")
        .select("id, amount, status, payment_method, created_at, booking_id");
      const { data: agencies } = await supabase
        .from("agencies")
        .select("id, agency_name, user_id, credit_limit, used_credit, credit_limit_type, is_active, commission_rate");

      const allBookings = bookings || [];
      const allPayments = payments || [];
      // Apply date range filter
      const rangeBookings = allBookings.filter(b => isInDateRange(b.created_at, dateRange));
      const rangePayments = allPayments.filter(p => isInDateRange(p.created_at, dateRange));

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const prevMonthStart = startOfMonth(subMonths(now, 1));
      const prevMonthEnd = endOfMonth(subMonths(now, 1));

      const confirmedBookings = rangeBookings.filter(b => b.status === "confirmed");
      const pendingPayments = rangePayments.filter(p => p.status === "proof_uploaded");
      const approvedPayments = rangePayments.filter(p => p.status === "approved");
      const thisMonthBookings = allBookings.filter(b => new Date(b.created_at) >= monthStart && new Date(b.created_at) <= monthEnd);
      const prevMonthBookings = allBookings.filter(b => new Date(b.created_at) >= prevMonthStart && new Date(b.created_at) <= prevMonthEnd);

      const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.total_amount, 0);
      const monthlyRevenue = thisMonthBookings.reduce((sum, b) => sum + b.total_amount, 0);
      const prevMonthlyRevenue = prevMonthBookings.reduce((sum, b) => sum + b.total_amount, 0);
      const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
      const collectedAmount = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalInvoiced = rangeBookings.reduce((sum, b) => sum + b.total_amount, 0);
      const collectionRate = totalInvoiced > 0 ? (collectedAmount / totalInvoiced) * 100 : 0;

      // MoM comparison
      const prevMonthRevenue = prevMonthlyRevenue;
      const momChange = prevMonthRevenue > 0 ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : monthlyRevenue > 0 ? 100 : 0;
      const thisMonthConfirmed = thisMonthBookings.filter(b => b.status === "confirmed").length;
      const prevMonthConfirmed = prevMonthBookings.filter(b => b.status === "confirmed").length;
      const momBookingsChange = prevMonthConfirmed > 0 ? ((thisMonthConfirmed - prevMonthConfirmed) / prevMonthConfirmed) * 100 : thisMonthConfirmed > 0 ? 100 : 0;

      const totalCommission = (agencies || []).reduce((sum, agency) => {
        const agencyBookings = rangeBookings.filter(b => b.user_id === agency.user_id);
        return sum + agencyBookings.reduce((s, b) => s + b.total_amount * ((agency.commission_rate || 0) / 100), 0);
      }, 0);

      // Revenue by booking type
      const revenueByType = ["package", "flight", "hotel", "tour", "visa"].map(type => {
        const typeBookings = confirmedBookings.filter(b => b.booking_type === type);
        return { name: type.charAt(0).toUpperCase() + type.slice(1), value: typeBookings.reduce((s, b) => s + b.total_amount, 0), count: typeBookings.length };
      }).filter(t => t.value > 0);

      // Top 5 agencies by confirmed revenue
      const topAgencies = (agencies || []).map(agency => {
        const agencyConfirmed = confirmedBookings.filter(b => b.user_id === agency.user_id);
        return {
          id: agency.id,
          name: agency.agency_name,
          revenue: agencyConfirmed.reduce((s, b) => s + b.total_amount, 0),
          bookings: agencyConfirmed.length,
        };
      }).filter(a => a.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      const agencyBalances = (agencies || []).map(agency => {
        const agencyBookings = rangeBookings.filter(b => b.user_id === agency.user_id);
        const agencyPayments = rangePayments.filter(p => p.status === "approved" && agencyBookings.some(b => b.id === p.booking_id));
        const totalBooked = agencyBookings.reduce((sum, b) => sum + b.total_amount, 0);
        const totalPaid = agencyPayments.reduce((sum, p) => sum + p.amount, 0);
        const outstanding = totalBooked - totalPaid;
        const creditUsage = agency.credit_limit ? ((agency.used_credit || 0) / agency.credit_limit) * 100 : 0;

        const unpaid = agencyBookings.filter(b => b.status === "pending_payment" || b.status === "payment_under_review" || b.status === "draft");
        let current = 0, over30 = 0, over60 = 0, over90 = 0;
        unpaid.forEach(b => {
          const days = Math.floor((now.getTime() - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24));
          const amt = b.total_amount || 0;
          if (days > 90) over90 += amt;
          else if (days > 60) over60 += amt;
          else if (days > 30) over30 += amt;
          else current += amt;
        });

        return { ...agency, totalBooked, totalPaid, outstanding, creditUsage, overLimit: agency.credit_limit > 0 && (agency.used_credit || 0) > agency.credit_limit, current, over30, over60, over90 };
      }).sort((a, b) => b.outstanding - a.outstanding);

      // Payment aging alerts
      const pendingOldPayments = allPayments.filter(p => {
        if (p.status !== "proof_uploaded") return false;
        const days = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return days >= 7;
      });
      const agencies90Overdue = agencyBalances.filter(a => a.over90 > 0);

      const dailyRevenue = Array.from({ length: 14 }, (_, i) => {
        const date = subDays(now, 13 - i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayBookings = rangeBookings.filter(b => format(new Date(b.created_at), "yyyy-MM-dd") === dateStr);
        return { date: format(date, "dd/MM"), revenue: dayBookings.reduce((sum, b) => sum + b.total_amount, 0), bookings: dayBookings.length };
      });

      const paymentMethods = rangePayments.reduce((acc, p) => { if (p.status === "approved") acc[p.payment_method] = (acc[p.payment_method] || 0) + p.amount; return acc; }, {} as Record<string, number>);
      const paymentMethodData = Object.entries(paymentMethods).map(([name, value]) => ({ name: name.replace("_", " "), value }));

      const debtTotals = {
        current: agencyBalances.reduce((s, a) => s + a.current, 0),
        over30: agencyBalances.reduce((s, a) => s + a.over30, 0),
        over60: agencyBalances.reduce((s, a) => s + a.over60, 0),
        over90: agencyBalances.reduce((s, a) => s + a.over90, 0),
        total: agencyBalances.reduce((s, a) => s + a.current + a.over30 + a.over60 + a.over90, 0),
      };

      return {
        totalRevenue, monthlyRevenue, pendingAmount, collectedAmount,
        pendingCount: pendingPayments.length,
        totalBookings: rangeBookings.length,
        confirmedBookings: confirmedBookings.length,
        agencyBalances, dailyRevenue, paymentMethodData,
        agenciesOverLimit: agencyBalances.filter(a => a.overLimit).length,
        collectionRate, totalCommission, totalInvoiced, debtTotals,
        // New data
        momChange, momBookingsChange, prevMonthRevenue: prevMonthlyRevenue,
        revenueByType, topAgencies,
        pendingOldPayments: pendingOldPayments.length,
        agencies90Overdue: agencies90Overdue.length,
        agencies90OverdueTotal: agencies90Overdue.reduce((s, a) => s + a.over90, 0),
      };
    },
  });
}

// ── Credit Report Hook ──
type Transaction = {
  id: string; agency_id: string; amount: number; balance_after: number;
  transaction_type: string; description: string | null; booking_id: string | null;
  created_by: string | null; created_at: string; agency_name?: string;
};
type AgencySummary = {
  id: string; agency_name: string; credit_limit: number; used_credit: number;
  credit_limit_type: string; is_active: boolean; totalTransactions: number;
  totalBookingAmount: number; totalPayments: number; totalAdjustments: number; usage: number;
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

      const agencyMap = new Map((agencies || []).map((a) => [a.id, a.agency_name]));
      const enrichedTransactions: Transaction[] = (transactions || []).map((t) => ({
        ...t, agency_name: agencyMap.get(t.agency_id) || "Unknown",
      }));

      const agencySummaries: AgencySummary[] = (agencies || []).map((agency) => {
        const agencyTx = enrichedTransactions.filter((t) => t.agency_id === agency.id);
        const creditLimit = Number(agency.credit_limit) || 0;
        const usedCredit = Number(agency.used_credit) || 0;
        return {
          id: agency.id, agency_name: agency.agency_name,
          credit_limit: creditLimit, used_credit: usedCredit,
          credit_limit_type: agency.credit_limit_type || "soft",
          is_active: agency.is_active ?? true,
          totalTransactions: agencyTx.length,
          totalBookingAmount: agencyTx.filter(t => t.transaction_type === "booking").reduce((s, t) => s + Number(t.amount), 0),
          totalPayments: agencyTx.filter(t => t.transaction_type === "payment").reduce((s, t) => s + Number(t.amount), 0),
          totalAdjustments: agencyTx.filter(t => t.transaction_type === "adjustment").reduce((s, t) => s + Number(t.amount), 0),
          usage: creditLimit > 0 ? Math.min(100, (usedCredit / creditLimit) * 100) : 0,
        };
      });

      const dailyData = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayTx = enrichedTransactions.filter(t => format(new Date(t.created_at), "yyyy-MM-dd") === dateStr);
        return {
          date: format(date, "dd/MM"),
          bookings: dayTx.filter(t => t.transaction_type === "booking").reduce((s, t) => s + Number(t.amount), 0),
          payments: dayTx.filter(t => t.transaction_type === "payment").reduce((s, t) => s + Number(t.amount), 0),
          count: dayTx.length,
        };
      });

      const totalCreditExtended = agencySummaries.reduce((s, a) => s + a.credit_limit, 0);
      const totalUsed = agencySummaries.reduce((s, a) => s + a.used_credit, 0);

      return {
        transactions: enrichedTransactions, agencySummaries, dailyData,
        stats: {
          totalCreditExtended, totalUsed,
          totalAvailable: totalCreditExtended - totalUsed,
          overLimitCount: agencySummaries.filter(a => a.credit_limit > 0 && a.used_credit > a.credit_limit).length,
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

// ── MoM Change Indicator ──
function MomIndicator({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0;
  return (
    <div className={cn("flex items-center gap-0.5 text-[10px] font-medium", isPositive ? "text-emerald-600" : "text-destructive")}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span>{isPositive ? "+" : ""}{value.toFixed(1)}%</span>
      <span className="text-muted-foreground font-normal ml-0.5">{label}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Tab Components
// ══════════════════════════════════════════════════════════

function DashboardTab({ stats, fmt }: { stats: any; fmt: (n: number) => string }) {
  return (
    <div className="space-y-4">
      {/* KPI Cards with MoM comparison */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fmt(stats?.totalRevenue || 0)}</p>
                <p className="text-[11px] text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fmt(stats?.monthlyRevenue || 0)}</p>
                <p className="text-[11px] text-muted-foreground">This Month</p>
                {stats?.momChange !== undefined && <MomIndicator value={stats.momChange} label="vs last month" />}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fmt(stats?.pendingAmount || 0)}</p>
                <p className="text-[11px] text-muted-foreground">{stats?.pendingCount || 0} Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.agenciesOverLimit || 0}</p>
                <p className="text-[11px] text-muted-foreground">Over Credit Limit</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collection, Commission & Profit Margin Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground font-medium">Collection Rate</p>
              <span className="text-lg font-bold">{(stats?.collectionRate || 0).toFixed(1)}%</span>
            </div>
            <Progress value={stats?.collectionRate || 0} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1">{fmt(stats?.collectedAmount || 0)} of {fmt(stats?.totalInvoiced || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Est. Total Commission</p>
            <p className="text-2xl font-bold text-primary">{fmt(Math.round(stats?.totalCommission || 0))}</p>
            <p className="text-[10px] text-muted-foreground">Net: {fmt(Math.round((stats?.totalRevenue || 0) - (stats?.totalCommission || 0)))}</p>
          </CardContent>
        </Card>
        {/* Profit Margin Gauge */}
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Profit Margin</p>
            {(() => {
              const rev = stats?.totalRevenue || 0;
              const comm = stats?.totalCommission || 0;
              const net = rev - comm;
              const margin = rev > 0 ? ((net / rev) * 100) : 0;
              return (
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{ value: margin, fill: "hsl(var(--primary))" }]}>
                        <RadialBar dataKey="value" background={{ fill: "hsl(var(--muted))" }} cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{margin.toFixed(0)}%</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{fmt(Math.round(net))}</p>
                    <p className="text-[10px] text-muted-foreground">Net Revenue</p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Type + Revenue Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 chart-card-header rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" /> Revenue Trend (14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.dailyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} formatter={(value: number) => [`${fmt(value)}`, "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="chart-card-header rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={stats?.paymentMethodData || []} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" label={({ name }) => name}>
                    {(stats?.paymentMethodData || []).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmt(value)} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Booking Type + Top Agencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Type Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Revenue by Service Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(stats?.revenueByType || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No confirmed revenue data yet.</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="h-[180px] w-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={stats.revenueByType} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                        {stats.revenueByType.map((entry: any, index: number) => (
                          <Cell key={index} fill={TYPE_COLORS[entry.name.toLowerCase()] || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => fmt(value)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {stats.revenueByType.map((entry: any) => {
                    const Icon = TYPE_ICONS[entry.name.toLowerCase()] || Package;
                    const total = stats.revenueByType.reduce((s: number, e: any) => s + e.value, 0);
                    const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
                    return (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{entry.name}</span>
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">{entry.count}</Badge>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{fmt(entry.value)}</span>
                          <span className="text-muted-foreground ml-1">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performing Agencies */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> Top Performing Agencies
            </CardTitle>
            <CardDescription className="text-[11px]">By confirmed revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {(stats?.topAgencies || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No agency revenue data yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.topAgencies.map((agency: any, index: number) => {
                  const maxRevenue = stats.topAgencies[0]?.revenue || 1;
                  const barWidth = (agency.revenue / maxRevenue) * 100;
                  return (
                    <div key={agency.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold",
                            index === 0 ? "bg-amber-500/20 text-amber-700" :
                            index === 1 ? "bg-slate-400/20 text-slate-600" :
                            index === 2 ? "bg-orange-400/20 text-orange-600" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {index + 1}
                          </span>
                          <span className="font-medium">{agency.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">{agency.bookings} bookings</Badge>
                          <span className="font-bold">{fmt(agency.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agency Balances Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Agency Credit & Balances
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Agency</TableHead>
                <TableHead className="text-xs">Credit Limit</TableHead>
                <TableHead className="text-xs">Used</TableHead>
                <TableHead className="text-xs">Usage</TableHead>
                <TableHead className="text-xs">Outstanding</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!stats?.agencyBalances?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No agency data available.</TableCell></TableRow>
              ) : (
                stats.agencyBalances.slice(0, 10).map((agency: any) => (
                  <TableRow key={agency.id} className={agency.overLimit ? "bg-destructive/5" : ""}>
                    <TableCell className="text-xs font-medium">{agency.agency_name}</TableCell>
                    <TableCell className="text-xs">{fmt(agency.credit_limit || 0)} <span className="text-[10px] text-muted-foreground ml-1">({agency.credit_limit_type})</span></TableCell>
                    <TableCell className="text-xs font-sans font-medium">{fmt(agency.used_credit || 0)}</TableCell>
                    <TableCell className="w-[120px]">
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(agency.creditUsage, 100)} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground w-8">{agency.creditUsage.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${agency.outstanding > 0 ? "text-amber-600" : "text-emerald-600"}`}>{fmt(agency.outstanding)}</span>
                    </TableCell>
                    <TableCell>
                      {agency.overLimit ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">Over Limit</Badge>
                      ) : agency.creditUsage > 80 ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300">Warning</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Debt Aging Summary */}
      {stats?.debtTotals && stats.debtTotals.total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Debt Aging Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-destructive">{fmt(stats.debtTotals.total)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground">Current</p>
                <p className="text-lg font-bold">{fmt(stats.debtTotals.current)}</p>
              </div>
              <div className="p-3 rounded-lg border border-amber-200">
                <p className="text-[10px] text-muted-foreground">30+ Days</p>
                <p className="text-lg font-bold text-amber-600">{fmt(stats.debtTotals.over30)}</p>
              </div>
              <div className="p-3 rounded-lg border border-orange-200">
                <p className="text-[10px] text-muted-foreground">60+ Days</p>
                <p className="text-lg font-bold text-orange-600">{fmt(stats.debtTotals.over60)}</p>
              </div>
              <div className="p-3 rounded-lg border border-destructive/30">
                <p className="text-[10px] text-muted-foreground">90+ Days</p>
                <p className="text-lg font-bold text-destructive">{fmt(stats.debtTotals.over90)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DebtsAgingTab({ stats, fmt }: { stats: any; fmt: (n: number) => string }) {
  const agenciesWithDebt = (stats?.agencyBalances || []).filter((a: any) => (a.current + a.over30 + a.over60 + a.over90) > 0);
  const chartData = agenciesWithDebt.slice(0, 10).map((a: any) => ({
    name: a.agency_name?.length > 15 ? a.agency_name.slice(0, 15) + "…" : a.agency_name,
    Current: a.current, "30+ Days": a.over30, "60+ Days": a.over60, "90+ Days": a.over90,
  }));

  const handleExport = () => {
    const rows = agenciesWithDebt.map((a: any) => ({
      Agency: a.agency_name, Current: a.current, "30+ Days": a.over30,
      "60+ Days": a.over60, "90+ Days": a.over90, Total: a.current + a.over30 + a.over60 + a.over90,
      "Credit Limit": a.credit_limit, "Used Credit": a.used_credit || 0,
    }));
    generateExcel(rows, "Debt Aging", `Debt_Aging_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  // Generate per-agency statement PDF
  const generateAgencyStatement = async (agency: any) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pw = pdf.internal.pageSize.getWidth();
    let y = 20;

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(26, 35, 126);
    pdf.text('Agency Financial Statement', pw / 2, y, { align: 'center' });
    y += 10;

    pdf.setFontSize(12);
    pdf.text(agency.agency_name, pw / 2, y, { align: 'center' });
    y += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text(`Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}`, pw / 2, y, { align: 'center' });
    y += 10;

    pdf.setDrawColor(26, 35, 126);
    pdf.setLineWidth(0.5);
    pdf.line(14, y, pw - 14, y);
    y += 10;

    // Summary
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Account Summary', 14, y);
    y += 7;

    const summaryItems = [
      ['Credit Limit', `$${(agency.credit_limit || 0).toLocaleString()} (${agency.credit_limit_type})`],
      ['Used Credit', `$${(agency.used_credit || 0).toLocaleString()}`],
      ['Outstanding Balance', `$${agency.outstanding.toLocaleString()}`],
      ['Current Debt', `$${agency.current.toLocaleString()}`],
      ['30+ Days Overdue', `$${agency.over30.toLocaleString()}`],
      ['60+ Days Overdue', `$${agency.over60.toLocaleString()}`],
      ['90+ Days Overdue', `$${agency.over90.toLocaleString()}`],
      ['Total Debt', `$${(agency.current + agency.over30 + agency.over60 + agency.over90).toLocaleString()}`],
    ];

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    summaryItems.forEach(([label, value], idx) => {
      if (idx % 2 === 0) { pdf.setFillColor(245, 247, 250); pdf.rect(14, y - 3.5, pw - 28, 7, 'F'); }
      pdf.text(label, 18, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, pw / 2, y);
      pdf.setFont('helvetica', 'normal');
      y += 7;
    });

    // Footer
    const ph = pdf.internal.pageSize.getHeight();
    pdf.setDrawColor(200, 200, 200);
    pdf.line(14, ph - 16, pw - 14, ph - 16);
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Confidential – Agency Financial Statement', pw / 2, ph - 11, { align: 'center' });

    pdf.save(`Agency_Statement_${agency.agency_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground font-medium">Total Outstanding</p><p className="text-2xl font-bold text-destructive">{fmt(stats?.debtTotals?.total || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground font-medium">Current</p><p className="text-2xl font-bold">{fmt(stats?.debtTotals?.current || 0)}</p></CardContent></Card>
        <Card className="border-amber-200"><CardContent className="p-4"><p className="text-[10px] text-muted-foreground font-medium">30+ Days</p><p className="text-2xl font-bold text-amber-600">{fmt(stats?.debtTotals?.over30 || 0)}</p></CardContent></Card>
        <Card className="border-orange-200"><CardContent className="p-4"><p className="text-[10px] text-muted-foreground font-medium">60+ Days</p><p className="text-2xl font-bold text-orange-600">{fmt(stats?.debtTotals?.over60 || 0)}</p></CardContent></Card>
        <Card className="border-destructive/30"><CardContent className="p-4"><p className="text-[10px] text-muted-foreground font-medium">90+ Days</p><p className="text-2xl font-bold text-destructive">{fmt(stats?.debtTotals?.over90 || 0)}</p></CardContent></Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agency Debt Aging Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Current" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="30+ Days" stackId="a" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="60+ Days" stackId="a" fill="hsl(var(--chart-3))" />
                  <Bar dataKey="90+ Days" stackId="a" fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debt Table with Generate Statement button */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Agency Debt Ranking
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport} className="text-xs">
              <Download className="h-3.5 w-3.5 mr-1" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Agency</TableHead>
                <TableHead className="text-xs">Current</TableHead>
                <TableHead className="text-xs">30+ Days</TableHead>
                <TableHead className="text-xs">60+ Days</TableHead>
                <TableHead className="text-xs">90+ Days</TableHead>
                <TableHead className="text-xs">Total Debt</TableHead>
                <TableHead className="text-xs">Credit Limit</TableHead>
                <TableHead className="text-xs w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agenciesWithDebt.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No outstanding debts found.</TableCell></TableRow>
              ) : (
                agenciesWithDebt.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs font-medium">{a.agency_name}</TableCell>
                    <TableCell className="text-xs">{fmt(a.current)}</TableCell>
                    <TableCell className="text-xs text-amber-600">{fmt(a.over30)}</TableCell>
                    <TableCell className="text-xs text-orange-600">{fmt(a.over60)}</TableCell>
                    <TableCell className="text-xs text-destructive">{fmt(a.over90)}</TableCell>
                    <TableCell className="text-xs font-bold">{fmt(a.current + a.over30 + a.over60 + a.over90)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(a.credit_limit || 0)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={() => generateAgencyStatement(a)}>
                        <FileText className="h-3 w-3 mr-1" /> Statement
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CreditReportTab() {
  const { data, isLoading } = useCreditReportData();
  const dateRange = useDateRange();
  const [searchQuery, setSearchQuery] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredTransactions = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((t) => {
      const matchesSearch = !searchQuery || t.agency_name?.toLowerCase().includes(searchQuery.toLowerCase()) || t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAgency = agencyFilter === "all" || t.agency_id === agencyFilter;
      const matchesType = typeFilter === "all" || t.transaction_type === typeFilter;
      const matchesDate = isInDateRange(t.created_at, dateRange);
      return matchesSearch && matchesAgency && matchesType && matchesDate;
    });
  }, [data, searchQuery, agencyFilter, typeFilter, dateRange]);

  const handleExportExcel = () => {
    if (!filteredTransactions.length) return;
    const rows = filteredTransactions.map((t) => ({
      Date: format(new Date(t.created_at), "yyyy-MM-dd HH:mm"), Agency: t.agency_name || "",
      Type: t.transaction_type, Amount: t.amount, "Balance After": t.balance_after, Description: t.description || "",
    }));
    generateExcel(rows, "Credit Transactions", "credit-transactions");
  };

  const handleExportPDF = () => {
    if (!filteredTransactions.length) return;
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Credit Usage Report", 14, 20);
    doc.setFontSize(10); doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);
    let y = 40;
    doc.setFontSize(8);
    doc.text("Date", 14, y); doc.text("Agency", 50, y); doc.text("Type", 100, y);
    doc.text("Amount", 130, y); doc.text("Balance", 160, y);
    y += 6; doc.line(14, y - 2, 196, y - 2);
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

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-64" /><Skeleton className="h-96" /></div>;

  const { stats, agencySummaries, dailyData } = data || { stats: { totalCreditExtended: 0, totalUsed: 0, totalAvailable: 0, overLimitCount: 0, totalTransactions: 0 }, agencySummaries: [], dailyData: [] };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Wallet className="h-4 w-4 text-primary" /></div><div><p className="text-xl font-bold">${stats.totalCreditExtended.toLocaleString()}</p><p className="text-[11px] text-muted-foreground">Total Credit Extended</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-amber-600" /></div><div><p className="text-xl font-bold">${stats.totalUsed.toLocaleString()}</p><p className="text-[11px] text-muted-foreground">Total Used</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><CreditCard className="h-4 w-4 text-emerald-600" /></div><div><p className="text-xl font-bold">${stats.totalAvailable.toLocaleString()}</p><p className="text-[11px] text-muted-foreground">Available Credit</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-destructive" /></div><div><p className="text-xl font-bold">{stats.overLimitCount}</p><p className="text-[11px] text-muted-foreground">Over Limit</p></div></div></CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Credit Activity (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="bookings" fill="hsl(var(--chart-2))" name="Bookings" radius={[3, 3, 0, 0]} />
                <Bar dataKey="payments" fill="hsl(var(--primary))" name="Payments" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Credit Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {agencySummaries.filter((a) => a.credit_limit > 0).sort((a, b) => b.usage - a.usage).slice(0, 8).map((agency) => (
                <div key={agency.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs"><span className="font-medium truncate max-w-[120px]">{agency.agency_name}</span><span className={cn("font-sans font-medium text-[10px]", agency.usage > 90 ? "text-destructive font-bold" : agency.usage > 70 ? "text-amber-600" : "text-muted-foreground")}>{agency.usage.toFixed(0)}%</span></div>
                  <Progress value={Math.min(agency.usage, 100)} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Transaction History ({filteredTransactions.length})</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input className="h-8 pl-8 text-xs w-48" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
              <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All Agencies" /></SelectTrigger>
                <SelectContent>{[{ id: "all", agency_name: "All Agencies" }, ...agencySummaries].map((a) => (<SelectItem key={a.id} value={a.id} className="text-xs">{a.agency_name}</SelectItem>))}</SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-xs h-8"><Download className="h-3.5 w-3.5 mr-1" /> Excel</Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="text-xs h-8"><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
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
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No credit transactions found</TableCell></TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs py-2.5">{format(new Date(tx.created_at), "dd/MM/yyyy")}<br /><span className="text-muted-foreground text-[10px]">{format(new Date(tx.created_at), "HH:mm")}</span></TableCell>
                      <TableCell className="text-xs font-medium py-2.5">{tx.agency_name}</TableCell>
                      <TableCell className="py-2.5">{transactionTypeBadge(tx.transaction_type)}</TableCell>
                      <TableCell className="text-xs font-semibold py-2.5">
                        <span className={tx.transaction_type === "payment" || tx.transaction_type === "refund" ? "text-emerald-600" : "text-amber-600"}>
                          {tx.transaction_type === "payment" || tx.transaction_type === "refund" ? "-" : "+"}${Number(tx.amount).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-2.5 text-muted-foreground">${Number(tx.balance_after).toLocaleString()}</TableCell>
                      <TableCell className="text-xs py-2.5 text-muted-foreground max-w-[200px] truncate">{tx.description || "—"}</TableCell>
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
}

function BookingReportsTab() {
  const { data: bookings, isLoading } = useBookings();
  const { data: payments } = usePayments();
  const navigate = useNavigate();
  const dateRange = useDateRange();
  const { fmt } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const dateFilteredBookings = useMemo(() => {
    return (bookings || []).filter(b => isInDateRange(b.created_at, dateRange));
  }, [bookings, dateRange]);

  const filteredBookings = dateFilteredBookings.filter((booking) => {
    const matchesSearch = booking.booking_number.toLowerCase().includes(searchTerm.toLowerCase()) || booking.booking_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesType = activeTab === "all" || booking.booking_type === activeTab;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getBookingsByType = (type: string) => dateFilteredBookings.filter(b => b.booking_type === type);
  const typeStats = { all: dateFilteredBookings.length, package: getBookingsByType("package").length, flight: getBookingsByType("flight").length, hotel: getBookingsByType("hotel").length, tour: getBookingsByType("tour").length, visa: getBookingsByType("visa").length };
  const totalRevenue = filteredBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
  const confirmedRevenue = filteredBookings.filter(b => b.status === "confirmed").reduce((s, b) => s + (b.total_amount || 0), 0);
  const pendingRevenue = filteredBookings.filter(b => b.status === "pending_payment" || b.status === "payment_under_review").reduce((s, b) => s + (b.total_amount || 0), 0);

  // Reconciliation
  const allBookingPayments = useMemo(() => {
    const bookingIds = new Set(filteredBookings.map(b => b.id));
    return (payments || []).filter(p => bookingIds.has(p.booking_id));
  }, [filteredBookings, payments]);
  const totalCollected = allBookingPayments.filter(p => p.status === "approved").reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = totalRevenue - totalCollected;
  const reconciliationRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;

  const getPassengers = (b: any) => {
    const pd = Array.isArray(b.passenger_details) ? b.passenger_details : [];
    return pd.map((p: any) => ({ name: `${p.firstName || ''} ${p.lastName || ''}`.trim(), type: p.type || p.guestType || 'ADT' })).filter((p: any) => p.name);
  };

  const getServiceName = (b: any) => {
    if (b.booking_type === 'package') return b.package_departures?.group_packages?.name || 'N/A';
    if (b.booking_type === 'flight') return b.flights?.airline ? `${b.flights.airline} ${b.flights.flight_number || ''}` : 'N/A';
    if (b.booking_type === 'hotel') return b.hotels?.name || 'N/A';
    if (b.booking_type === 'tour') return b.tours?.name || 'N/A';
    if (b.booking_type === 'visa') return b.visas ? `${b.visas.country} - ${b.visas.visa_type}` : 'N/A';
    return 'N/A';
  };

  const getDestination = (b: any) => {
    if (b.booking_type === 'package') return b.package_departures?.group_packages?.cities?.name || 'N/A';
    if (b.booking_type === 'flight') return b.flights?.arrival_city || 'N/A';
    if (b.booking_type === 'hotel') return b.hotels?.city_id ? 'Hotel' : 'N/A';
    if (b.booking_type === 'tour') return 'Tour';
    if (b.booking_type === 'visa') return b.visas?.country || 'N/A';
    return 'N/A';
  };

  const getBookingPayments = (bookingId: string) => {
    return (payments || []).filter(p => p.booking_id === bookingId);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Confirmed</Badge>;
      case 'pending_payment': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending Payment</Badge>;
      case 'payment_under_review': return <Badge className="bg-primary/10 text-primary border-primary/20">Under Review</Badge>;
      case 'canceled': return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Canceled</Badge>;
      case 'refunded': return <Badge className="bg-muted text-muted-foreground">Refunded</Badge>;
      default: return <Badge variant="outline">Draft</Badge>;
    }
  };

  const exportToExcel = () => {
    const rows: Record<string, any>[] = [];
    filteredBookings.forEach((booking) => {
      const passengers = getPassengers(booking);
      const rawPax = Array.isArray(booking.passenger_details) ? booking.passenger_details : [];
      const bPayments = getBookingPayments(booking.id);
      const paid = bPayments.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0);
      const paymentMethods = bPayments.map(p => p.payment_method).filter(Boolean).join(', ');
      
      if (rawPax.length === 0) {
        rows.push({
          'Booking Number': booking.booking_number, 'Type': booking.booking_type,
          'Status': booking.status || 'draft', 'Service': getServiceName(booking),
          'Destination': getDestination(booking),
          'Passenger #': '-', 'First Name': '-', 'Last Name': '-',
          'Passport': '-', 'Passport Expiry': '-', 'Date of Birth': '-', 'Guest Type': '-',
          'Pax Count': booking.passengers || 1,
          'Total Amount': booking.total_amount, 'Paid Amount': paid,
          'Outstanding': booking.total_amount - paid,
          'Payment Methods': paymentMethods || 'N/A',
          'Notes': booking.notes || '', 'Special Requests': booking.special_requests || '',
          'Created': booking.created_at ? format(new Date(booking.created_at), 'dd/MM/yyyy HH:mm') : 'N/A',
        });
      } else {
        rawPax.forEach((p: any, idx: number) => {
          rows.push({
            'Booking Number': booking.booking_number, 'Type': booking.booking_type,
            'Status': booking.status || 'draft', 'Service': getServiceName(booking),
            'Destination': getDestination(booking),
            'Passenger #': idx + 1,
            'First Name': p.firstName || p.first_name || '',
            'Last Name': p.lastName || p.last_name || '',
            'Passport': p.passportNumber || p.passport_number || '',
            'Passport Expiry': p.passportExpiry || p.passport_expiry || '',
            'Date of Birth': p.dateOfBirth || p.date_of_birth || p.dob || '',
            'Guest Type': p.type || p.guestType || p.guest_type || 'ADT',
            'Pax Count': booking.passengers || 1,
            'Total Amount': booking.total_amount, 'Paid Amount': paid,
            'Outstanding': booking.total_amount - paid,
            'Payment Methods': paymentMethods || 'N/A',
            'Notes': booking.notes || '', 'Special Requests': booking.special_requests || '',
            'Created': booking.created_at ? format(new Date(booking.created_at), 'dd/MM/yyyy HH:mm') : 'N/A',
          });
        });
      }
    });
    generateExcel(rows, "Financial Report", `Financial_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
  };

  const exportToPDF = () => {
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    
    pdf.setFontSize(16); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 35, 126);
    pdf.text('Financial Booking Report', 14, 16);
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 22);
    
    pdf.setFontSize(9); pdf.setTextColor(0, 0, 0);
    pdf.text(`Total: ${fmt(totalRevenue)}  |  Confirmed: ${fmt(confirmedRevenue)}  |  Pending: ${fmt(pendingRevenue)}  |  Collected: ${fmt(totalCollected)}  |  Outstanding: ${fmt(totalOutstanding)}`, 14, 30);
    
    const headers = ['Booking #', 'Type', 'Service', 'Passenger', 'Passport', 'DOB', 'Pax', 'Amount', 'Paid', 'Status'];
    const colWidths = [26, 15, 40, 36, 28, 22, 12, 24, 24, 20];
    let y = 38;
    
    const drawHeaders = () => {
      pdf.setFillColor(26, 35, 126); pdf.rect(14, y - 5, pw - 28, 8, 'F');
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
      let x = 14;
      headers.forEach((h, i) => { pdf.text(h, x + 1, y); x += colWidths[i]; });
      y += 6; pdf.setTextColor(0, 0, 0); pdf.setFont('helvetica', 'normal');
    };
    drawHeaders();
    
    filteredBookings.forEach((b) => {
      const rawPax = Array.isArray(b.passenger_details) ? b.passenger_details : [];
      const paid = getBookingPayments(b.id).filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0);
      const paxList = rawPax.length > 0 ? rawPax : [null];
      
      paxList.forEach((p: any, pIdx: number) => {
        if (y > ph - 15) { pdf.addPage(); y = 20; drawHeaders(); }
        if (pIdx === 0) { pdf.setFillColor(245, 247, 250); pdf.rect(14, y - 4, pw - 28, 6, 'F'); }
        
        const pName = p ? `${p.firstName || p.first_name || ''} ${p.lastName || p.last_name || ''}`.trim() : '-';
        const passport = p ? (p.passportNumber || p.passport_number || '-') : '-';
        const dob = p ? (p.dateOfBirth || p.date_of_birth || p.dob || '-') : '-';
        
        const row = [
          pIdx === 0 ? b.booking_number : '', pIdx === 0 ? b.booking_type : '',
          pIdx === 0 ? getServiceName(b).substring(0, 22) : '',
          pName.substring(0, 20), passport.substring(0, 16), dob.substring(0, 10),
          pIdx === 0 ? String(b.passengers || 1) : '',
          pIdx === 0 ? `$${b.total_amount.toLocaleString()}` : '',
          pIdx === 0 ? `$${paid.toLocaleString()}` : '',
          pIdx === 0 ? (b.status || 'draft') : '',
        ];
        let x = 14; pdf.setFontSize(7);
        row.forEach((c, i) => { pdf.text(c, x + 1, y); x += colWidths[i]; });
        y += 6;
      });
    });
    
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
      pdf.text(`Page ${i} of ${totalPages}`, pw - 30, ph - 8);
    }
    
    pdf.save(`Financial_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const statCards = [
    { title: "Total Revenue", value: fmt(totalRevenue), icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
    { title: "Confirmed", value: fmt(confirmedRevenue), icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { title: "Pending", value: fmt(pendingRevenue), icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
    { title: "Bookings", value: filteredBookings.length.toString(), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <Card key={i}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-[11px] text-muted-foreground">{s.title}</p><p className="text-2xl font-bold">{s.value}</p></div><div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center`}><s.icon className={`h-5 w-5 ${s.color}`} /></div></div></CardContent></Card>
        ))}
      </div>

      {/* Reconciliation Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Reconciliation Summary</span>
            </div>
            <span className="text-sm font-bold">{reconciliationRate.toFixed(1)}% Collected</span>
          </div>
          <Progress value={reconciliationRate} className="h-2.5 mb-2" />
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Total Invoiced</p>
              <p className="text-base font-bold">{fmt(totalRevenue)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Collected</p>
              <p className="text-base font-bold text-emerald-600">{fmt(totalCollected)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Outstanding</p>
              <p className={cn("text-base font-bold", totalOutstanding > 0 ? "text-amber-600" : "text-emerald-600")}>{fmt(totalOutstanding)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-2xl">
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-1">{typeStats.all}</Badge></TabsTrigger>
          <TabsTrigger value="package"><Package className="h-3 w-3" /> <Badge variant="secondary" className="ml-1">{typeStats.package}</Badge></TabsTrigger>
          <TabsTrigger value="flight"><PlaneTakeoff className="h-3 w-3" /> <Badge variant="secondary" className="ml-1">{typeStats.flight}</Badge></TabsTrigger>
          <TabsTrigger value="hotel"><Hotel className="h-3 w-3" /> <Badge variant="secondary" className="ml-1">{typeStats.hotel}</Badge></TabsTrigger>
          <TabsTrigger value="tour"><Compass className="h-3 w-3" /> <Badge variant="secondary" className="ml-1">{typeStats.tour}</Badge></TabsTrigger>
          <TabsTrigger value="visa"><Stamp className="h-3 w-3" /> <Badge variant="secondary" className="ml-1">{typeStats.visa}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters & Export */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by booking number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
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
            <Button onClick={exportToExcel} disabled={filteredBookings.length === 0} size="sm" className="bg-emerald-600 hover:bg-emerald-700"><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
            <Button onClick={exportToPDF} disabled={filteredBookings.length === 0} size="sm" variant="outline"><FileText className="h-4 w-4 mr-1" /> PDF</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table with expandable rows */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Bookings ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No bookings found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8"></TableHead>
                  <TableHead className="text-xs">Booking #</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Service</TableHead>
                  <TableHead className="text-xs">Destination</TableHead>
                  <TableHead className="text-xs text-center">Pax</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs text-right">Paid</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((b) => {
                  const isExpanded = expandedRows.has(b.id);
                  const bPayments = getBookingPayments(b.id);
                  const paidAmount = bPayments.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0);
                  const balance = b.total_amount - paidAmount;
                  const pax = getPassengers(b);

                  return (
                    <Fragment key={b.id}>
                      <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => toggleRow(b.id)}>
                        <TableCell className="text-xs px-2">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-sans font-medium text-xs font-medium">{b.booking_number}</TableCell>
                        <TableCell className="text-xs capitalize">{b.booking_type}</TableCell>
                        <TableCell className="text-xs">{getServiceName(b)}</TableCell>
                        <TableCell className="text-xs">{getDestination(b)}</TableCell>
                        <TableCell className="text-xs text-center">{b.passengers || 1}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{fmt(b.total_amount)}</TableCell>
                        <TableCell className="text-xs text-right">
                          <span className={paidAmount >= b.total_amount ? "text-emerald-600 font-medium" : "text-amber-600"}>{fmt(paidAmount)}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(b.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{b.created_at ? format(new Date(b.created_at), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={10} className="p-0">
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Passengers */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-semibold flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" /> Passengers ({pax.length || b.passengers || 1})</h4>
                                  {pax.length > 0 ? (
                                    <div className="space-y-1">
                                      {pax.map((p: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                          <User className="h-3 w-3 text-muted-foreground" />
                                          <span>{p.name}</span>
                                          <Badge variant="outline" className="text-[9px] px-1 py-0">{p.type}</Badge>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No passenger details</p>
                                  )}
                                </div>

                                {/* Payment Summary */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-semibold flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5 text-primary" /> Payment Summary</h4>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Total Amount:</span><span className="font-medium">{fmt(b.total_amount)}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Paid:</span><span className="text-emerald-600 font-medium">{fmt(paidAmount)}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Balance:</span><span className={balance > 0 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>{fmt(balance)}</span></div>
                                    {bPayments.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-border space-y-1">
                                        {bPayments.map(p => (
                                          <div key={p.id} className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground">{p.payment_method.replace('_', ' ')}</span>
                                            <div className="flex items-center gap-1.5">
                                              <span>{fmt(p.amount)}</span>
                                              <Badge variant="outline" className="text-[9px] px-1 py-0">{p.status}</Badge>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Actions & Notes */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-semibold flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-primary" /> Details & Voucher</h4>
                                  {b.special_requests && (
                                    <p className="text-xs text-muted-foreground"><span className="font-medium">Special Requests:</span> {b.special_requests}</p>
                                  )}
                                  {b.notes && (() => {
                                    try {
                                      const parsed = JSON.parse(b.notes);
                                      if (typeof parsed === 'object' && parsed !== null) {
                                        const entries = Object.entries(parsed).filter(([, v]) => v !== null && v !== '' && v !== false);
                                        return (
                                          <div className="text-xs text-muted-foreground space-y-0.5">
                                            <span className="font-medium">Notes:</span>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 bg-muted/40 rounded p-2">
                                              {entries.map(([key, val]) => (
                                                <div key={key} className="flex gap-1">
                                                  <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}:</span>
                                                  <span>{String(val)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      }
                                    } catch { /* not JSON, show as text */ }
                                    return <p className="text-xs text-muted-foreground"><span className="font-medium">Notes:</span> {b.notes}</p>;
                                  })()}
                                  <div className="flex gap-2 pt-1">
                                    <Button size="sm" variant="default" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); navigate(`/bookings/${b.id}`); }}>
                                      <ExternalLink className="h-3 w-3 mr-1" /> Full Detail & Voucher
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Main Finance Center Page
// ══════════════════════════════════════════════════════════

async function generateConsolidatedPDF(stats: any, dateLabel: string, companySettings?: { companyName: string; logo: string | null; contactEmail: string; phone: string; address: string; primaryColor: string }) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pw = pdf.internal.pageSize.getWidth();
  const now = new Date();
  let y = 14;

  const name = companySettings?.companyName || 'GTS Booking';
  const email = companySettings?.contactEmail || '';
  const phone = companySettings?.phone || '';
  const address = companySettings?.address || '';

  // ── Try to add company logo ──
  if (companySettings?.logo) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = companySettings.logo!;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      const logoH = 16;
      const logoW = (img.width / img.height) * logoH;
      pdf.addImage(dataUrl, 'PNG', 14, y - 4, logoW, logoH);
    } catch { /* logo failed, skip */ }
  }

  // ── Company name & info (right-aligned) ──
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(26, 35, 126);
  pdf.text(name, pw - 14, y + 2, { align: 'right' });
  y += 7;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  const contactParts = [email, phone, address].filter(Boolean);
  if (contactParts.length) {
    pdf.text(contactParts.join('  |  '), pw - 14, y, { align: 'right' });
    y += 4;
  }
  y += 4;

  // ── Title & Period ──
  pdf.setDrawColor(26, 35, 126);
  pdf.setLineWidth(0.5);
  pdf.line(14, y, pw - 14, y);
  y += 8;
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(26, 35, 126);
  pdf.text('Consolidated Financial Statement', pw / 2, y, { align: 'center' });
  y += 7;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  pdf.text(`Period: ${dateLabel}`, pw / 2, y, { align: 'center' });
  y += 5;
  pdf.text(`Generated: ${format(now, 'MMMM d, yyyy HH:mm')}`, pw / 2, y, { align: 'center' });
  y += 3;
  pdf.setDrawColor(26, 35, 126);
  pdf.setLineWidth(0.3);
  pdf.line(14, y, pw - 14, y);
  y += 10;
  pdf.setTextColor(0, 0, 0);

  // ── Section 1: Key Performance Indicators ──
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(26, 35, 126);
  pdf.text('1. Key Performance Indicators', 14, y);
  y += 8;
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  const kpis = [
    ['Total Revenue', `$${(stats?.totalRevenue || 0).toLocaleString()}`],
    ['Monthly Revenue', `$${(stats?.monthlyRevenue || 0).toLocaleString()}`],
    ['Pending Payments', `$${(stats?.pendingAmount || 0).toLocaleString()} (${stats?.pendingCount || 0} pending)`],
    ['Collection Rate', `${(stats?.collectionRate || 0).toFixed(1)}%`],
    ['Total Invoiced', `$${(stats?.totalInvoiced || 0).toLocaleString()}`],
    ['Collected Amount', `$${(stats?.collectedAmount || 0).toLocaleString()}`],
    ['Est. Commission', `$${Math.round(stats?.totalCommission || 0).toLocaleString()}`],
    ['Net Revenue', `$${Math.round((stats?.totalRevenue || 0) - (stats?.totalCommission || 0)).toLocaleString()}`],
    ['Total Bookings', `${stats?.totalBookings || 0}`],
    ['Confirmed Bookings', `${stats?.confirmedBookings || 0}`],
    ['Agencies Over Limit', `${stats?.agenciesOverLimit || 0}`],
  ];

  // KPI table
  pdf.setFillColor(26, 35, 126);
  pdf.rect(14, y - 4, pw - 28, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Metric', 18, y);
  pdf.text('Value', pw / 2, y);
  y += 6;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');

  kpis.forEach(([label, value], idx) => {
    if (idx % 2 === 0) { pdf.setFillColor(245, 247, 250); pdf.rect(14, y - 3.5, pw - 28, 7, 'F'); }
    pdf.text(label, 18, y);
    pdf.setFont('helvetica', 'bold');
    pdf.text(value, pw / 2, y);
    pdf.setFont('helvetica', 'normal');
    y += 7;
  });
  y += 6;

  // ── Section 2: Debt Aging Summary ──
  if (y > 240) { pdf.addPage(); y = 20; }
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(26, 35, 126);
  pdf.text('2. Debt Aging Summary', 14, y);
  y += 8;
  pdf.setTextColor(0, 0, 0);

  const dt = stats?.debtTotals || { total: 0, current: 0, over30: 0, over60: 0, over90: 0 };

  pdf.setFillColor(26, 35, 126);
  pdf.rect(14, y - 4, pw - 28, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  const agingHeaders = ['Total Outstanding', 'Current', '30+ Days', '60+ Days', '90+ Days'];
  const colW = (pw - 28) / 5;
  agingHeaders.forEach((h, i) => pdf.text(h, 16 + i * colW, y));
  y += 6;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const agingVals = [`$${dt.total.toLocaleString()}`, `$${dt.current.toLocaleString()}`, `$${dt.over30.toLocaleString()}`, `$${dt.over60.toLocaleString()}`, `$${dt.over90.toLocaleString()}`];
  agingVals.forEach((v, i) => pdf.text(v, 16 + i * colW, y));
  y += 10;

  const agenciesWithDebt = (stats?.agencyBalances || []).filter((a: any) => (a.current + a.over30 + a.over60 + a.over90) > 0);
  if (agenciesWithDebt.length > 0) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Agency Debt Breakdown', 14, y);
    y += 6;

    pdf.setFillColor(26, 35, 126);
    pdf.rect(14, y - 4, pw - 28, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    const dHeaders = ['Agency', 'Current', '30+ Days', '60+ Days', '90+ Days', 'Total', 'Credit Limit'];
    const dColW = (pw - 28) / 7;
    dHeaders.forEach((h, i) => pdf.text(h, 16 + i * dColW, y));
    y += 6;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');

    agenciesWithDebt.slice(0, 25).forEach((a: any, idx: number) => {
      if (y > 275) { pdf.addPage(); y = 20; }
      if (idx % 2 === 0) { pdf.setFillColor(245, 247, 250); pdf.rect(14, y - 3.5, pw - 28, 7, 'F'); }
      const row = [
        (a.agency_name || '').substring(0, 22),
        `$${a.current.toLocaleString()}`,
        `$${a.over30.toLocaleString()}`,
        `$${a.over60.toLocaleString()}`,
        `$${a.over90.toLocaleString()}`,
        `$${(a.current + a.over30 + a.over60 + a.over90).toLocaleString()}`,
        `$${(a.credit_limit || 0).toLocaleString()}`,
      ];
      row.forEach((c, i) => {
        if (i === 5) pdf.setFont('helvetica', 'bold');
        pdf.text(c, 16 + i * dColW, y);
        if (i === 5) pdf.setFont('helvetica', 'normal');
      });
      y += 7;
    });
    y += 6;
  }

  // ── Section 3: Payment Methods Breakdown ──
  if (y > 240) { pdf.addPage(); y = 20; }
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(26, 35, 126);
  pdf.text('3. Payment Methods Distribution', 14, y);
  y += 8;
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');

  const pmData = stats?.paymentMethodData || [];
  if (pmData.length > 0) {
    const pmTotal = pmData.reduce((s: number, p: any) => s + p.value, 0);
    pmData.forEach((pm: any) => {
      const pct = pmTotal > 0 ? ((pm.value / pmTotal) * 100).toFixed(1) : '0';
      pdf.text(`${pm.name}: $${pm.value.toLocaleString()} (${pct}%)`, 18, y);
      y += 6;
    });
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Total Collected: $${pmTotal.toLocaleString()}`, 18, y);
    y += 10;
  }

  // ── Section 4: Top Agency Balances ──
  if (y > 240) { pdf.addPage(); y = 20; }
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(26, 35, 126);
  pdf.text('4. Agency Credit & Balance Overview', 14, y);
  y += 8;
  pdf.setTextColor(0, 0, 0);

  const topAgencies = (stats?.agencyBalances || []).slice(0, 15);
  if (topAgencies.length > 0) {
    pdf.setFillColor(26, 35, 126);
    pdf.rect(14, y - 4, pw - 28, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    const aHeaders = ['Agency', 'Credit Limit', 'Used', 'Usage %', 'Outstanding', 'Status'];
    const aColW = (pw - 28) / 6;
    aHeaders.forEach((h, i) => pdf.text(h, 16 + i * aColW, y));
    y += 6;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');

    topAgencies.forEach((a: any, idx: number) => {
      if (y > 275) { pdf.addPage(); y = 20; }
      if (idx % 2 === 0) { pdf.setFillColor(245, 247, 250); pdf.rect(14, y - 3.5, pw - 28, 7, 'F'); }
      const status = a.overLimit ? 'OVER LIMIT' : a.creditUsage > 80 ? 'WARNING' : 'OK';
      const row = [
        (a.agency_name || '').substring(0, 22),
        `$${(a.credit_limit || 0).toLocaleString()}`,
        `$${(a.used_credit || 0).toLocaleString()}`,
        `${a.creditUsage.toFixed(0)}%`,
        `$${a.outstanding.toLocaleString()}`,
        status,
      ];
      row.forEach((c, i) => pdf.text(c, 16 + i * aColW, y));
      y += 7;
    });
  }

  // ── Footer on each page ──
  const totalPages = pdf.getNumberOfPages();
  const ph = pdf.internal.pageSize.getHeight();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(14, ph - 16, pw - 14, ph - 16);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    const footerInfo = [name, email, phone].filter(Boolean).join('  •  ');
    pdf.text(footerInfo, 14, ph - 11);
    pdf.setFontSize(7);
    pdf.text('Confidential – Financial Statement', pw / 2, ph - 11, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Page ${p} of ${totalPages}`, pw - 14, ph - 11, { align: 'right' });
  }

  pdf.save(`Financial_Statement_${format(now, 'yyyy-MM-dd')}.pdf`);
}

export default function FinanceCenter() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const { data: stats, isLoading } = useFinanceStats(dateRange);
  const { settings: companySettings } = useCompanySettings();
  const { fmt } = useCurrency();
  const [alertDismissed, setAlertDismissed] = useState(false);

  const clearDateRange = () => setDateRange({ from: undefined, to: undefined });

  const dateLabel = dateRange.from && dateRange.to
    ? `${format(dateRange.from, "dd/MM")} – ${format(dateRange.to, "dd/MM/yyyy")}`
    : dateRange.from
      ? `From ${format(dateRange.from, "dd/MM/yyyy")}`
      : "All Time";

  // Determine if alert should show
  const showAlert = !alertDismissed && stats && ((stats.pendingOldPayments || 0) > 0 || (stats.agencies90Overdue || 0) > 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <DateRangeContext.Provider value={dateRange}>
      <div className="space-y-4">
        {/* Payment Aging Alert Banner */}
        {showAlert && (
          <Alert variant="destructive" className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Payment Attention Required</span>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setAlertDismissed(true)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </AlertTitle>
            <AlertDescription className="text-xs mt-1 space-x-3">
              {(stats?.pendingOldPayments || 0) > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <strong>{stats.pendingOldPayments}</strong> payments pending for 7+ days
                </span>
              )}
              {(stats?.agencies90Overdue || 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  <strong>{stats.agencies90Overdue}</strong> agencies 90+ days overdue ({fmt(stats.agencies90OverdueTotal || 0)})
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Finance Center
            </h1>
            <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5">
              {format(new Date(), "MMMM yyyy")}
            </Badge>
          </div>

          {/* Global Date Range Picker */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("text-xs h-8 gap-1.5", (dateRange.from || dateRange.to) && "border-primary text-primary")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
                <div className="flex items-center justify-between p-3 pt-0 border-t border-border">
                  <div className="flex gap-1.5">
                    {[
                      { label: "7d", days: 7 },
                      { label: "30d", days: 30 },
                      { label: "90d", days: 90 },
                    ].map(({ label, days }) => (
                      <Button key={label} variant="ghost" size="sm" className="text-xs h-7 px-2"
                        onClick={() => setDateRange({ from: subDays(new Date(), days), to: new Date() })}>
                        {label}
                      </Button>
                    ))}
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2"
                      onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>
                      This Month
                    </Button>
                  </div>
                  {(dateRange.from || dateRange.to) && (
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive" onClick={clearDateRange}>
                      Clear
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={() => generateConsolidatedPDF(stats, dateLabel, companySettings)}
              disabled={!stats}
            >
              <Printer className="h-3.5 w-3.5" />
              Financial Statement
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
            <TabsTrigger value="debts" className="text-xs">Debts & Aging</TabsTrigger>
            <TabsTrigger value="credit" className="text-xs">Credit Report</TabsTrigger>
            <TabsTrigger value="bookings" className="text-xs">Booking Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab stats={stats} fmt={fmt} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTab />
          </TabsContent>

          <TabsContent value="debts">
            <DebtsAgingTab stats={stats} fmt={fmt} />
          </TabsContent>

          <TabsContent value="credit">
            <CreditReportTab />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DateRangeContext.Provider>
  );
}

// ══════════════════════════════════════════════════════════
// Payments Tab (embedded from Payments page)
// ══════════════════════════════════════════════════════════

const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case "unpaid": return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Unpaid</Badge>;
    case "proof_uploaded": return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300">Pending</Badge>;
    case "approved": return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300">Approved</Badge>;
    case "rejected": return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">Rejected</Badge>;
    case "refunded": return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">Refunded</Badge>;
    default: return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{status}</Badge>;
  }
};

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case "qicard": return "QiCard";
    case "first_iraqi_bank": return "First Iraqi Bank";
    case "bank_transfer": return "Bank Transfer";
    case "pay_in_office": return "Pay in Office";
    case "pay_by_transfer": return "Pay by Transfer";
    case "pay_by_card": return "Pay by Card";
    case "rasheed_bank": return "Rasheed Bank";
    case "trade_bank_iraq": return "Trade Bank of Iraq (TBI)";
    case "national_bank_iraq": return "National Bank of Iraq";
    case "kurdistan_intl_bank": return "Kurdistan International Bank";
    default: return method;
  }
};

function PaymentsTab() {
  const { data: payments, isLoading, refetch } = usePayments();
  const approvePayment = useApprovePayment();
  const rejectPayment = useRejectPayment();
  const { fmt } = useCurrency();

  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  const pendingPayments = payments?.filter((p) => p.status === "proof_uploaded") || [];
  const pendingTotal = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const approvedPayments = payments?.filter((p) => p.status === "approved") || [];
  const approvedTotal = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalBooked = payments?.reduce((sum, p) => p.bookings?.total_amount ? sum + Number(p.bookings.total_amount) : sum, 0) || 0;
  const outstanding = totalBooked - approvedTotal;

  const handleApprove = async (payment: Payment) => {
    try { await approvePayment.mutateAsync(payment.id); toast.success("Payment approved!"); }
    catch (error: any) { toast.error("Failed to approve payment", { description: error.message }); }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    let success = 0;
    for (const id of selectedIds) { try { await approvePayment.mutateAsync(id); success++; } catch {} }
    toast.success(`${success} payment(s) approved`);
    setSelectedIds([]);
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    let success = 0;
    for (const id of selectedIds) { try { await rejectPayment.mutateAsync({ id, reason: bulkRejectReason }); success++; } catch {} }
    toast.success(`${success} payment(s) rejected`);
    setSelectedIds([]);
    setBulkRejectOpen(false);
    setBulkRejectReason("");
  };

  const handleRejectClick = (payment: Payment) => { setSelectedPayment(payment); setRejectReason(""); setRejectModalOpen(true); };

  const handleRejectConfirm = async () => {
    if (!selectedPayment) return;
    try { await rejectPayment.mutateAsync({ id: selectedPayment.id, reason: rejectReason }); toast.error("Payment rejected"); setRejectModalOpen(false); setSelectedPayment(null); }
    catch (error: any) { toast.error("Failed to reject payment", { description: error.message }); }
  };

  const handleViewVoucher = (payment: Payment) => { setSelectedPayment(payment); setVoucherModalOpen(true); };
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const filteredPayments = (payments || []).filter(payment => {
    const matchesSearch = !searchQuery || payment.id.toLowerCase().includes(searchQuery.toLowerCase()) || payment.bookings?.booking_number?.toLowerCase().includes(searchQuery.toLowerCase()) || payment.transaction_reference?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    const pendingIds = filteredPayments.filter(p => p.status === "proof_uploaded").map(p => p.id);
    setSelectedIds(prev => prev.length === pendingIds.length ? [] : pendingIds);
  };

  const selectedPendingCount = selectedIds.filter(id => pendingPayments.some(p => p.id === id)).length;

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-4">
      {/* Voucher Modal */}
      <Dialog open={voucherModalOpen} onOpenChange={setVoucherModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm">Booking Voucher</DialogTitle></DialogHeader>
          {selectedPayment && selectedPayment.bookings && (
            <UniversalVoucher
              details={{
                type: (selectedPayment.bookings.booking_type as VoucherType) || "package",
                bookingId: selectedPayment.bookings.id,
                bookingNumber: selectedPayment.bookings.booking_number,
                serviceName: selectedPayment.bookings.package_departures?.group_packages?.name || "Service",
                totalAmount: Number(selectedPayment.amount),
                passengerCount: selectedPayment.bookings.passengers || 1,
                passengerNames: [],
                destination: selectedPayment.bookings.package_departures?.group_packages?.cities?.name,
                departureDate: selectedPayment.bookings.package_departures?.departure_date ? new Date(selectedPayment.bookings.package_departures.departure_date) : undefined,
                returnDate: selectedPayment.bookings.package_departures?.return_date ? new Date(selectedPayment.bookings.package_departures.return_date) : undefined,
                status: selectedPayment.status === "approved" ? "confirmed" : "pending",
              }}
              onClose={() => setVoucherModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Reject Payment</DialogTitle>
            <DialogDescription className="text-xs">Provide a reason for rejecting this payment.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="min-h-[80px] text-xs" />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)} className="text-xs h-8">Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleRejectConfirm} disabled={rejectPayment.isPending} className="text-xs h-8">
              {rejectPayment.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Modal */}
      <Dialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Reject {selectedPendingCount} Payment(s)</DialogTitle>
            <DialogDescription className="text-xs">This will reject all selected pending payments.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason for rejection..." value={bulkRejectReason} onChange={(e) => setBulkRejectReason(e.target.value)} className="min-h-[80px] text-xs" />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkRejectOpen(false)} className="text-xs h-8">Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleBulkReject} className="text-xs h-8">Reject All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Clock className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{pendingPayments.length}</p><p className="text-[11px] text-muted-foreground">Pending ({fmt(pendingTotal)})</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-bold">{fmt(approvedTotal)}</p><p className="text-[11px] text-muted-foreground">Collected</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold">{fmt(outstanding)}</p><p className="text-[11px] text-muted-foreground">Outstanding</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><CreditCard className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{(payments || []).length}</p><p className="text-[11px] text-muted-foreground">Total Payments</p></div></div></CardContent></Card>
      </div>

      {/* Filters + Bulk Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search booking #, reference..." className="pl-8 h-8 text-xs" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="proof_uploaded">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 text-xs gap-1"><RefreshCw className="h-3.5 w-3.5" /></Button>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-1 ml-2">
            <Badge variant="secondary" className="text-[11px]">{selectedIds.length} selected</Badge>
            <Button size="sm" onClick={handleBulkApprove} disabled={approvePayment.isPending} className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700"><CheckCircle className="h-3 w-3" /> Approve All</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkRejectOpen(true)} className="h-7 text-[11px] gap-1 text-destructive border-destructive/30"><XCircle className="h-3 w-3" /> Reject All</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="h-7 text-[11px]">Clear</Button>
          </div>
        )}
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"><Checkbox checked={selectedIds.length > 0 && selectedIds.length === filteredPayments.filter(p => p.status === "proof_uploaded").length} onCheckedChange={toggleSelectAll} /></TableHead>
                <TableHead className="text-xs">Booking</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Method</TableHead>
                <TableHead className="text-xs">Proof</TableHead>
                <TableHead className="text-xs">Submitted</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">No payments found</TableCell></TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className={selectedIds.includes(payment.id) ? "bg-muted/50" : ""}>
                    <TableCell>{payment.status === "proof_uploaded" && <Checkbox checked={selectedIds.includes(payment.id)} onCheckedChange={() => toggleSelect(payment.id)} />}</TableCell>
                    <TableCell>
                      <p className="text-xs font-sans font-medium">{payment.bookings?.booking_number || "N/A"}</p>
                      <p className="text-[10px] text-muted-foreground">{payment.bookings?.booking_type}</p>
                    </TableCell>
                    <TableCell className="text-xs font-bold">{fmt(Number(payment.amount))}</TableCell>
                    <TableCell className="text-[11px]">{getPaymentMethodLabel(payment.payment_method)}</TableCell>
                    <TableCell>
                      {payment.proof_url ? (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-primary" onClick={() => window.open(payment.proof_url!, "_blank")}>
                          <FileText className="h-3 w-3 mr-1" /> View
                        </Button>
                      ) : <span className="text-[10px] text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground font-sans font-medium">{format(new Date(payment.created_at!), "MM/dd HH:mm")}</TableCell>
                    <TableCell>{getPaymentStatusBadge(payment.status || "unpaid")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {payment.status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => handleViewVoucher(payment)} className="h-6 px-2 text-[11px] gap-1"><Ticket className="h-3 w-3" /> Voucher</Button>
                        )}
                        {payment.status === "proof_uploaded" && (
                          <>
                            <Button size="sm" onClick={() => handleApprove(payment)} disabled={approvePayment.isPending} className="h-6 px-2 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700"><CheckCircle className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => handleRejectClick(payment)} className="h-6 px-2 text-[11px] gap-1 text-destructive border-destructive/30"><XCircle className="h-3 w-3" /></Button>
                          </>
                        )}
                        {payment.status === "rejected" && payment.rejection_reason && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={payment.rejection_reason}>{payment.rejection_reason}</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
