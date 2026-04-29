import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import {
  TrendingUp, DollarSign, CreditCard, AlertTriangle, Building2, Clock,
  CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, Wallet, PieChart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

function useFinanceStats() {
  return useQuery({
    queryKey: ["finance-stats"],
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

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const confirmedBookings = bookings?.filter(b => b.status === "confirmed") || [];
      const pendingPayments = payments?.filter(p => p.status === "proof_uploaded") || [];
      const approvedPayments = payments?.filter(p => p.status === "approved") || [];
      const thisMonthBookings = bookings?.filter(b => new Date(b.created_at) >= monthStart && new Date(b.created_at) <= monthEnd) || [];

      const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.total_amount, 0);
      const monthlyRevenue = thisMonthBookings.reduce((sum, b) => sum + b.total_amount, 0);
      const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
      const collectedAmount = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalInvoiced = (bookings || []).reduce((sum, b) => sum + b.total_amount, 0);
      const collectionRate = totalInvoiced > 0 ? (collectedAmount / totalInvoiced) * 100 : 0;

      // Total commission estimate
      const totalCommission = (agencies || []).reduce((sum, agency) => {
        const agencyBookings = (bookings || []).filter(b => b.user_id === agency.user_id);
        return sum + agencyBookings.reduce((s, b) => s + b.total_amount * ((agency.commission_rate || 0) / 100), 0);
      }, 0);

      // Agency balances with debt aging
      const agencyBalances = (agencies || []).map(agency => {
        const agencyBookings = (bookings || []).filter(b => b.user_id === agency.user_id);
        const agencyPayments = (payments || []).filter(p => p.status === "approved" && agencyBookings.some(b => b.id === p.booking_id));
        const totalBooked = agencyBookings.reduce((sum, b) => sum + b.total_amount, 0);
        const totalPaid = agencyPayments.reduce((sum, p) => sum + p.amount, 0);
        const outstanding = totalBooked - totalPaid;
        const creditUsage = agency.credit_limit ? ((agency.used_credit || 0) / agency.credit_limit) * 100 : 0;
        
        // Debt aging
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

      // Daily revenue chart
      const dailyRevenue = Array.from({ length: 14 }, (_, i) => {
        const date = subDays(now, 13 - i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayBookings = (bookings || []).filter(b => format(new Date(b.created_at), "yyyy-MM-dd") === dateStr);
        return { date: format(date, "dd/MM"), revenue: dayBookings.reduce((sum, b) => sum + b.total_amount, 0), bookings: dayBookings.length };
      });

      // Payment method distribution
      const paymentMethods = (payments || []).reduce((acc, p) => { if (p.status === "approved") acc[p.payment_method] = (acc[p.payment_method] || 0) + p.amount; return acc; }, {} as Record<string, number>);
      const paymentMethodData = Object.entries(paymentMethods).map(([name, value]) => ({ name: name.replace("_", " "), value }));

      // Debt aging totals
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
        totalBookings: bookings?.length || 0,
        confirmedBookings: confirmedBookings.length,
        agencyBalances, dailyRevenue, paymentMethodData,
        agenciesOverLimit: agencyBalances.filter(a => a.overLimit).length,
        collectionRate, totalCommission, totalInvoiced, debtTotals,
      };
    },
  });
}

export default function FinanceDashboard() {
  const { data: stats, isLoading } = useFinanceStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Finance Dashboard
        </h1>
        <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5">
          {format(new Date(), "MMMM yyyy")}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats?.totalRevenue?.toLocaleString() || 0}</p>
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
                <p className="text-2xl font-bold">${stats?.monthlyRevenue?.toLocaleString() || 0}</p>
                <p className="text-[11px] text-muted-foreground">This Month</p>
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
                <p className="text-2xl font-bold">${stats?.pendingAmount?.toLocaleString() || 0}</p>
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

      {/* Collection Rate & Commission Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground font-medium">Collection Rate</p>
              <span className="text-lg font-bold">{(stats?.collectionRate || 0).toFixed(1)}%</span>
            </div>
            <Progress value={stats?.collectionRate || 0} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1">${(stats?.collectedAmount || 0).toLocaleString()} of ${(stats?.totalInvoiced || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Est. Total Commission</p>
            <p className="text-2xl font-bold text-coral">${Math.round(stats?.totalCommission || 0).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Net: ${Math.round((stats?.totalRevenue || 0) - (stats?.totalCommission || 0)).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Total Outstanding Debt</p>
            <p className="text-2xl font-bold text-amber-600">${(stats?.debtTotals?.total || 0).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{stats?.agencyBalances?.filter(a => (a.current + a.over30 + a.over60 + a.over90) > 0).length || 0} agencies with debt</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              Revenue Trend (14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.dailyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={stats?.paymentMethodData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name }) => name}
                  >
                    {(stats?.paymentMethodData || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agency Balances */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Agency Credit & Balances
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
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                    No agency data available.
                  </TableCell>
                </TableRow>
              ) : (
                stats.agencyBalances.slice(0, 10).map((agency) => (
                  <TableRow key={agency.id} className={agency.overLimit ? "bg-destructive/5" : ""}>
                    <TableCell className="text-xs font-medium">{agency.agency_name}</TableCell>
                    <TableCell className="text-xs">
                      ${agency.credit_limit?.toLocaleString() || 0}
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({agency.credit_limit_type})
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      ${(agency.used_credit || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="w-[120px]">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={Math.min(agency.creditUsage, 100)} 
                          className="h-1.5 flex-1"
                        />
                        <span className="text-[10px] text-muted-foreground w-8">
                          {agency.creditUsage.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${agency.outstanding > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        ${agency.outstanding.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {agency.overLimit ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">
                          Over Limit
                        </Badge>
                      ) : agency.creditUsage > 80 ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300">
                          Warning
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300">
                          OK
                        </Badge>
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
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Debt Aging Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-destructive">${stats.debtTotals.total.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground">Current</p>
                <p className="text-lg font-bold">${stats.debtTotals.current.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg border border-amber-200">
                <p className="text-[10px] text-muted-foreground">30+ Days</p>
                <p className="text-lg font-bold text-amber-600">${stats.debtTotals.over30.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg border border-orange-200">
                <p className="text-[10px] text-muted-foreground">60+ Days</p>
                <p className="text-lg font-bold text-orange-600">${stats.debtTotals.over60.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg border border-destructive/30">
                <p className="text-[10px] text-muted-foreground">90+ Days</p>
                <p className="text-lg font-bold text-destructive">${stats.debtTotals.over90.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
