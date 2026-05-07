import { useMemo } from "react";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, startOfDay } from "date-fns";
import { Calendar, Plane, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Flight } from "@/hooks/useFlights";

interface FlightAvailabilityCalendarProps {
  flights: Flight[];
  month?: Date;
  onDateSelect?: (date: Date, flights: Flight[]) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function FlightAvailabilityCalendar({ 
  flights, 
  month = new Date(),
  onDateSelect 
}: FlightAvailabilityCalendarProps) {
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  // Get flights for a specific date - handles both specific and recurring schedules
  const getFlightsForDate = (date: Date): Flight[] => {
    return flights.filter(flight => {
      if (!flight.is_active) return false;
      
      const scheduleType = (flight as any).schedule_type || 'specific';
      const recurringDays = (flight as any).recurring_days as number[] | null;
      const validFrom = (flight as any).valid_from ? new Date((flight as any).valid_from) : null;
      const validUntil = (flight as any).valid_until ? new Date((flight as any).valid_until) : null;
      
      if (scheduleType === 'recurring' && recurringDays && recurringDays.length > 0) {
        // Check if date is within valid range
        if (validFrom && date < validFrom) return false;
        if (validUntil && date > validUntil) return false;
        
        // Check if day of week matches
        return recurringDays.includes(getDay(date));
      } else {
        // Specific date - check departure date
        const departureDate = new Date(flight.departure_date);
        return isSameDay(departureDate, date);
      }
    });
  };

  // Get availability status for a date
  const getAvailabilityStatus = (flightsOnDate: Flight[]) => {
    if (flightsOnDate.length === 0) return 'unavailable';
    
    const totalSeats = flightsOnDate.reduce((sum, f) => sum + (f.available_seats || 0), 0);
    if (totalSeats === 0) return 'sold-out';
    if (totalSeats <= 10) return 'limited';
    return 'available';
  };

  // Get padding days for the start of the month
  const startPadding = getDay(startOfMonth(month));

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Flight Availability - {format(month, 'MMMM yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for padding */}
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}
          
          {/* Calendar Days */}
          {calendarDays.map(day => {
            const flightsOnDate = getFlightsForDate(day);
            const status = getAvailabilityStatus(flightsOnDate);
            const isToday = isSameDay(day, new Date());
            const isPast = startOfDay(day) < startOfDay(new Date());
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateSelect?.(day, flightsOnDate)}
                disabled={isPast || status === 'unavailable'}
                className={cn(
                  "aspect-square rounded-lg p-1 text-sm flex flex-col items-center justify-center transition-all relative",
                  isPast && "opacity-40 cursor-not-allowed",
                  !isPast && status === 'unavailable' && "bg-secondary/50 cursor-not-allowed",
                  !isPast && status === 'available' && "bg-green-500/20 hover:bg-green-500/30 text-green-700 cursor-pointer",
                  !isPast && status === 'limited' && "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-700 cursor-pointer",
                  !isPast && status === 'sold-out' && "bg-red-500/20 text-red-700",
                  isToday && "ring-2 ring-primary ring-offset-1"
                )}
              >
                <span className="font-medium">{format(day, 'd')}</span>
                {flightsOnDate.length > 0 && !isPast && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Plane className="h-3 w-3" />
                    <span className="text-[10px]">{flightsOnDate.length}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-green-500/30" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-yellow-500/30" />
            <span className="text-muted-foreground">Limited</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-red-500/30" />
            <span className="text-muted-foreground">Sold Out</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-secondary/50" />
            <span className="text-muted-foreground">No Flights</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
