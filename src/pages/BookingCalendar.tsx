import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package,
  Users,
  Plane,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { useAllDepartures } from "@/hooks/useAllDepartures";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_payment: "bg-gold/20 text-gold border-gold/30",
  payment_under_review: "bg-primary/20 text-primary border-primary/30",
  confirmed: "bg-success/20 text-success border-success/30",
  canceled: "bg-destructive/20 text-destructive border-destructive/30",
  refunded: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending_payment: "Pending Payment",
  payment_under_review: "Under Review",
  confirmed: "Confirmed",
  canceled: "Canceled",
  refunded: "Refunded",
};

interface DayEvent {
  type: "booking" | "departure";
  id: string;
  title: string;
  status?: string;
  passengers?: number;
  destination?: string;
  availableSeats?: number;
}

const BookingCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: bookings, isLoading: bookingsLoading } = useBookings();
  const { data: departures, isLoading: departuresLoading } = useAllDepartures();

  const isLoading = bookingsLoading || departuresLoading;

  // Get all days in the calendar view (including padding days)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Map events to dates
  const eventsByDate = useMemo(() => {
    const map = new Map<string, DayEvent[]>();

    // Add bookings (by departure date)
    bookings?.forEach((booking) => {
      if (booking.package_departures?.departure_date) {
        const dateKey = format(new Date(booking.package_departures.departure_date), "yyyy-MM-dd");
        const existing = map.get(dateKey) || [];
        existing.push({
          type: "booking",
          id: booking.id,
          title: booking.booking_number,
          status: booking.status || "draft",
          passengers: booking.passengers || 1,
          destination: booking.package_departures.group_packages?.cities?.name,
        });
        map.set(dateKey, existing);
      }
    });

    // Add departures
    departures?.forEach((departure) => {
      const dateKey = format(new Date(departure.departure_date), "yyyy-MM-dd");
      const existing = map.get(dateKey) || [];
      existing.push({
        type: "departure",
        id: departure.id,
        title: departure.group_packages?.name || "Package Departure",
        destination: departure.group_packages?.cities?.name,
        availableSeats: departure.available_seats,
      });
      map.set(dateKey, existing);
    });

    return map;
  }, [bookings, departures]);

  const getEventsForDate = (date: Date): DayEvent[] => {
    return eventsByDate.get(format(date, "yyyy-MM-dd")) || [];
  };

  const handleDateClick = (date: Date) => {
    const events = getEventsForDate(date);
    if (events.length > 0) {
      setSelectedDate(date);
      setDetailsOpen(true);
    }
  };

  // Stats for the current month
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const monthBookings = bookings?.filter((b) => {
      const date = b.package_departures?.departure_date;
      if (!date) return false;
      const d = new Date(date);
      return d >= monthStart && d <= monthEnd;
    }) || [];

    const monthDepartures = departures?.filter((d) => {
      const date = new Date(d.departure_date);
      return date >= monthStart && date <= monthEnd;
    }) || [];

    return {
      totalBookings: monthBookings.length,
      confirmedBookings: monthBookings.filter((b) => b.status === "confirmed").length,
      pendingBookings: monthBookings.filter(
        (b) => b.status === "pending_payment" || b.status === "payment_under_review"
      ).length,
      totalDepartures: monthDepartures.length,
      totalPassengers: monthBookings.reduce((sum, b) => sum + (b.passengers || 0), 0),
    };
  }, [bookings, departures, currentMonth]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Booking Calendar</h1>
          <p className="text-muted-foreground">
            View all departures and bookings in a monthly calendar format
          </p>
        </div>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{monthStats.totalBookings}</p>
              <p className="text-xs text-muted-foreground">Total Bookings</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{monthStats.confirmedBookings}</p>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gold">{monthStats.pendingBookings}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-coral/10 flex items-center justify-center">
              <Plane className="h-5 w-5 text-coral" />
            </div>
            <div>
              <p className="text-2xl font-bold">{monthStats.totalDepartures}</p>
              <p className="text-xs text-muted-foreground">Departures</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{monthStats.totalPassengers}</p>
              <p className="text-xs text-muted-foreground">Passengers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const events = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const hasBookings = events.some((e) => e.type === "booking");
              const hasDepartures = events.some((e) => e.type === "departure");
              const confirmedCount = events.filter(
                (e) => e.type === "booking" && e.status === "confirmed"
              ).length;
              const pendingCount = events.filter(
                (e) =>
                  e.type === "booking" &&
                  (e.status === "pending_payment" || e.status === "payment_under_review")
              ).length;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "min-h-24 p-2 rounded-lg border text-left transition-colors",
                    isCurrentMonth
                      ? "bg-card hover:bg-muted/50"
                      : "bg-muted/30 text-muted-foreground",
                    isToday && "border-primary",
                    events.length > 0 && "cursor-pointer"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isToday &&
                          "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Event indicators */}
                  <div className="mt-1 space-y-1">
                    {hasDepartures && (
                      <div className="flex items-center gap-1 text-xs">
                        <Plane className="h-3 w-3 text-coral" />
                        <span className="text-coral font-medium truncate">
                          {events.filter((e) => e.type === "departure").length} departures
                        </span>
                      </div>
                    )}
                    {confirmedCount > 0 && (
                      <Badge className="bg-success/20 text-success border-success/30 text-[10px] px-1.5 py-0">
                        {confirmedCount} confirmed
                      </Badge>
                    )}
                    {pendingCount > 0 && (
                      <Badge className="bg-gold/20 text-gold border-gold/30 text-[10px] px-1.5 py-0">
                        {pendingCount} pending
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-coral" />
              <span className="text-sm text-muted-foreground">Departure</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-success/20 text-success">Confirmed</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-gold/20 text-gold">Pending</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary">Under Review</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "dd/MM/yyyy")}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {selectedDate &&
                getEventsForDate(selectedDate).map((event) => (
                  <div
                    key={`${event.type}-${event.id}`}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {event.type === "departure" ? (
                          <Plane className="h-4 w-4 text-coral" />
                        ) : (
                          <Package className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-medium">{event.title}</span>
                      </div>
                      {event.type === "booking" && event.status && (
                        <Badge className={statusColors[event.status]}>
                          {statusLabels[event.status]}
                        </Badge>
                      )}
                    </div>
                    {event.destination && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {event.destination}
                      </div>
                    )}
                    {event.type === "booking" && event.passengers && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Users className="h-3 w-3" />
                        {event.passengers} passengers
                      </div>
                    )}
                    {event.type === "departure" && event.availableSeats !== undefined && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {event.availableSeats} seats available
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingCalendar;
