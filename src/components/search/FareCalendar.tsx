import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameMonth,
  isBefore,
  startOfDay,
  addDays,
  parseISO,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Flight } from "@/hooks/useFlights";

interface FareCalendarProps {
  flights: Flight[] | undefined;
  fromCity: string;
  toCity: string;
  onDateSelect?: (date: Date, price: number) => void;
  getEffectivePrice?: (flight: Flight) => number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function FareCalendar({ flights, fromCity, toCity, onDateSelect, getEffectivePrice }: FareCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfDay(new Date());

  // Get flights for a specific date considering recurring schedules
  const getFlightsForDate = (relevantFlights: Flight[], date: Date) => {
    const dayOfWeek = getDay(date);
    return relevantFlights.filter((flight) => {
      if (flight.schedule_type === "recurring" && flight.recurring_days) {
        const validFrom = flight.valid_from ? parseISO(flight.valid_from) : null;
        const validUntil = flight.valid_until ? parseISO(flight.valid_until) : null;
        const isInValidPeriod =
          (!validFrom || date >= validFrom) && (!validUntil || date <= validUntil);
        return isInValidPeriod && flight.recurring_days.includes(dayOfWeek);
      } else {
        return isSameDay(parseISO(flight.departure_date), date);
      }
    });
  };

  // Build price map for visible months (current + next)
  const priceMap = useMemo(() => {
    const map: Record<string, { cheapest: number; flightCount: number; seats: number }> = {};
    if (!flights) return map;

    const relevantFlights = flights.filter((f) => {
      if (!f.is_active) return false;
      if (fromCity && !f.departure_city.toLowerCase().includes(fromCity.toLowerCase())) return false;
      if (toCity && !f.arrival_city.toLowerCase().includes(toCity.toLowerCase())) return false;
      return true;
    });

    // Scan 180 days ahead
    for (let i = 0; i < 180; i++) {
      const date = addDays(today, i);
      const matching = getFlightsForDate(relevantFlights, date);
      if (matching.length > 0) {
        const cheapest = Math.min(...matching.map((f) => getEffectivePrice ? getEffectivePrice(f) : f.price));
        const totalSeats = matching.reduce((sum, f) => sum + (f.available_seats || 0), 0);
        map[format(date, "yyyy-MM-dd")] = {
          cheapest,
          flightCount: matching.length,
          seats: totalSeats,
        };
      }
    }
    return map;
  }, [flights, fromCity, toCity, getEffectivePrice]);

  // Find global cheapest across all dates
  const globalCheapest = useMemo(() => {
    const prices = Object.values(priceMap).map((v) => v.cheapest);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [priceMap]);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Pad start with empty slots
    const startPadding = getDay(monthStart);
    const paddedDays: (Date | null)[] = Array(startPadding).fill(null);
    paddedDays.push(...days);

    // Pad end to complete the grid
    while (paddedDays.length % 7 !== 0) {
      paddedDays.push(null);
    }

    return paddedDays;
  }, [currentMonth]);

  const getPriceColor = (price: number): string => {
    if (price === globalCheapest) return "text-success font-bold";
    if (price <= globalCheapest * 1.2) return "text-success";
    if (price <= globalCheapest * 1.5) return "text-warning";
    return "text-destructive";
  };

  const getCellBg = (price: number): string => {
    if (price === globalCheapest) return "bg-success/10 border-success/30";
    if (price <= globalCheapest * 1.2) return "bg-success/5 border-success/20";
    if (price <= globalCheapest * 1.5) return "bg-warning/5 border-warning/20";
    return "bg-muted/30 border-border/50";
  };

  const hasRoute = fromCity && toCity;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plane className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">Fare Calendar</h3>
            {hasRoute ? (
              <p className="text-xs text-muted-foreground">
                {fromCity} → {toCity} • Cheapest fares per day
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Select departure & destination to view fares</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            disabled={isSameMonth(currentMonth, new Date())}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground min-w-[140px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-success/20 border border-success/40" />
          <span className="text-muted-foreground">Cheapest</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-warning/20 border border-warning/40" />
          <span className="text-muted-foreground">Mid-range</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted/50 border border-border" />
          <span className="text-muted-foreground">Higher</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted/20 border border-border/30" />
          <span className="text-muted-foreground">No flights</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-border/50 rounded-xl overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            if (!day) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="h-[60px] border-b border-r border-border/20 bg-muted/10"
                />
              );
            }

            const dateKey = format(day, "yyyy-MM-dd");
            const data = priceMap[dateKey];
            const isPast = isBefore(day, today);
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <button
                key={dateKey}
                disabled={isPast || !data || !hasRoute}
                onClick={() => data && onDateSelect?.(day, data.cheapest)}
                className={cn(
                  "h-[60px] border-b border-r border-border/20 p-1 text-left transition-all relative group",
                  isPast && "opacity-40 cursor-not-allowed bg-muted/10",
                  !isPast && data && hasRoute && "hover:ring-2 hover:ring-primary/40 hover:z-10 cursor-pointer",
                  !isPast && data && getCellBg(data.cheapest),
                  !isPast && !data && "bg-background",
                  !isCurrentMonth && "opacity-50"
                )}
              >
                {/* Date number */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      isToday && "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]",
                      !isToday && "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {data && data.cheapest === globalCheapest && !isPast && (
                    <Badge className="h-3.5 px-1 text-[8px] bg-success text-success-foreground border-none">
                      Best
                    </Badge>
                  )}
                </div>

                {/* Price */}
                {data && !isPast ? (
                  <div className="mt-1">
                    <p className={cn("text-sm font-bold leading-tight", getPriceColor(data.cheapest))}>
                      ${data.cheapest}
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                      {data.flightCount} flight{data.flightCount > 1 ? "s" : ""} • {data.seats} seats
                    </p>
                  </div>
                ) : !isPast && hasRoute ? (
                  <p className="text-[9px] text-muted-foreground mt-2">—</p>
                ) : null}

                {/* Hover tooltip effect */}
                {data && !isPast && hasRoute && (
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary stats */}
      {hasRoute && Object.keys(priceMap).length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl text-xs">
          <div>
            <span className="text-muted-foreground">Cheapest fare:</span>
            <span className="ml-1.5 font-bold text-success">${globalCheapest}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Available dates:</span>
            <span className="ml-1.5 font-bold text-foreground">{Object.keys(priceMap).length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Route:</span>
            <span className="ml-1.5 font-semibold text-foreground">{fromCity} → {toCity}</span>
          </div>
        </div>
      )}
    </div>
  );
}
