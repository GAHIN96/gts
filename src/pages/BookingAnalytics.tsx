import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  Package,
  MapPin,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { useBookings } from "@/hooks/useBookings";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--gold))", "hsl(var(--coral))", "hsl(var(--muted))"];

const BookingAnalytics = () => {
  const { data: bookings, isLoading } = useBookings();

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    if (!bookings) return null;

    // Monthly booking trends (last 6 months)
    const last6Months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    const monthlyData = last6Months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthBookings = bookings.filter((b) => {
        const date = new Date(b.created_at || "");
        return date >= monthStart && date <= monthEnd;
      });

      const confirmedBookings = monthBookings.filter((b) => b.status === "confirmed");
      const revenue = confirmedBookings.reduce((sum, b) => sum + b.total_amount, 0);
      const passengers = monthBookings.reduce((sum, b) => sum + (b.passengers || 0), 0);

      return {
        month: format(month, "MMM"),
        fullMonth: format(month, "MMMM yyyy"),
        bookings: monthBookings.length,
        confirmed: confirmedBookings.length,
        revenue,
        passengers,
      };
    });

    // Revenue by destination
    const destinationRevenue = bookings.reduce((acc, booking) => {
      const destination = booking.package_departures?.group_packages?.cities?.name || "Other";
      const existing = acc.find((d) => d.name === destination);
      if (existing) {
        existing.value += booking.total_amount;
        existing.bookings += 1;
      } else {
        acc.push({ name: destination, value: booking.total_amount, bookings: 1 });
      }
      return acc;
    }, [] as { name: string; value: number; bookings: number }[]);

    // Sort by value and take top 5
    const topDestinations = destinationRevenue
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Status distribution
    const statusDistribution = bookings.reduce((acc, booking) => {
      const status = booking.status || "draft";
      const existing = acc.find((s) => s.name === status);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: status, value: 1 });
      }
      return acc;
    }, [] as { name: string; value: number }[]);

    // Seasonal patterns (bookings by month of travel)
    const seasonalData = bookings.reduce((acc, booking) => {
      if (booking.package_departures?.departure_date) {
        const month = format(parseISO(booking.package_departures.departure_date), "MMM");
        const existing = acc.find((s) => s.month === month);
        if (existing) {
          existing.bookings += 1;
          existing.passengers += booking.passengers || 0;
        } else {
          acc.push({ month, bookings: 1, passengers: booking.passengers || 0 });
        }
      }
      return acc;
    }, [] as { month: string; bookings: number; passengers: number }[]);

    // Calculate totals and growth
    const totalRevenue = bookings
      .filter((b) => b.status === "confirmed")
      .reduce((sum, b) => sum + b.total_amount, 0);
    
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length;
    const totalPassengers = bookings.reduce((sum, b) => sum + (b.passengers || 0), 0);

    // Calculate growth (compare current month to previous)
    const currentMonthBookings = monthlyData[monthlyData.length - 1]?.bookings || 0;
    const previousMonthBookings = monthlyData[monthlyData.length - 2]?.bookings || 1;
    const bookingGrowth = ((currentMonthBookings - previousMonthBookings) / previousMonthBookings) * 100;

    const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0;
    const previousMonthRevenue = monthlyData[monthlyData.length - 2]?.revenue || 1;
    const revenueGrowth = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;

    return {
      monthlyData,
      topDestinations,
      statusDistribution,
      seasonalData,
      totals: {
        revenue: totalRevenue,
        bookings: totalBookings,
        confirmed: confirmedBookings,
        passengers: totalPassengers,
      },
      growth: {
        bookings: bookingGrowth,
        revenue: revenueGrowth,
      },
    };
  }, [bookings]);

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    pending_payment: "Pending Payment",
    payment_under_review: "Under Review",
    confirmed: "Confirmed",
    canceled: "Canceled",
    refunded: "Refunded",
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No booking data available for analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Booking Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into booking trends, revenue, and seasonal patterns
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  ${analyticsData.totals.revenue.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {analyticsData.growth.revenue >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span
                    className={`text-sm ${
                      analyticsData.growth.revenue >= 0
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {analyticsData.growth.revenue >= 0 ? "+" : ""}
                    {analyticsData.growth.revenue.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold text-foreground">
                  {analyticsData.totals.bookings}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {analyticsData.growth.bookings >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span
                    className={`text-sm ${
                      analyticsData.growth.bookings >= 0
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {analyticsData.growth.bookings >= 0 ? "+" : ""}
                    {analyticsData.growth.bookings.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold text-foreground">
                  {analyticsData.totals.confirmed}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {analyticsData.totals.bookings > 0
                    ? (
                        (analyticsData.totals.confirmed / analyticsData.totals.bookings) *
                        100
                      ).toFixed(1)
                    : 0}
                  % conversion rate
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gold/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-gold" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Passengers</p>
                <p className="text-2xl font-bold text-foreground">
                  {analyticsData.totals.passengers}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Avg{" "}
                  {analyticsData.totals.bookings > 0
                    ? (
                        analyticsData.totals.passengers / analyticsData.totals.bookings
                      ).toFixed(1)
                    : 0}{" "}
                  per booking
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-coral/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-coral" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Trends */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Booking Trends</CardTitle>
            <CardDescription>Monthly bookings and revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelFormatter={(label) => {
                      const data = analyticsData.monthlyData.find((d) => d.month === label);
                      return data?.fullMonth || label;
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="bookings"
                    name="Bookings"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue ($)"
                    stroke="hsl(var(--success))"
                    fill="hsl(var(--success) / 0.2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Destination */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Revenue by Destination</CardTitle>
            <CardDescription>Top 5 destinations by total revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.topDestinations}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {analyticsData.topDestinations.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {analyticsData.topDestinations.map((dest, index) => (
                <div key={dest.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {dest.name} ({dest.bookings} bookings)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Booking Status Distribution</CardTitle>
            <CardDescription>Current status of all bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.statusDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    className="text-xs"
                    tickFormatter={(value) => statusLabels[value] || value}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [value, "Bookings"]}
                    labelFormatter={(label) => statusLabels[label] || label}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Seasonal Patterns */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Travel Seasonality</CardTitle>
            <CardDescription>Booking patterns by travel month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.seasonalData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="bookings"
                    name="Bookings"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="passengers"
                    name="Passengers"
                    fill="hsl(var(--coral))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Destinations Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Top Performing Destinations
          </CardTitle>
          <CardDescription>Destinations ranked by revenue and booking volume</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {analyticsData.topDestinations.map((dest, index) => (
              <div
                key={dest.name}
                className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    className={
                      index === 0
                        ? "bg-gold text-white"
                        : index === 1
                        ? "bg-muted text-foreground"
                        : "bg-coral/20 text-coral"
                    }
                  >
                    #{index + 1}
                  </Badge>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-foreground">{dest.name}</h4>
                <p className="text-lg font-bold text-primary">
                  ${dest.value.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dest.bookings} bookings
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingAnalytics;
