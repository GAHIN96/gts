import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, isWithinInterval, differenceInDays, startOfDay } from "date-fns";
import { Calendar, Building, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Hotel } from "@/hooks/useHotels";

interface HotelAvailabilityCalendarProps {
  hotels: Hotel[];
  month?: Date;
  onDateSelect?: (date: Date, hotels: Hotel[]) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HotelAvailabilityCalendar({ 
  hotels, 
  month = new Date(),
  onDateSelect 
}: HotelAvailabilityCalendarProps) {
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  // Get hotels available for a specific date
  const getHotelsForDate = (date: Date): Hotel[] => {
    return hotels.filter(hotel => {
      if (!hotel.is_active) return false;
      
      const validFrom = (hotel as any).valid_from ? new Date((hotel as any).valid_from) : null;
      const validUntil = (hotel as any).valid_until ? new Date((hotel as any).valid_until) : null;
      
      // If no validity dates, hotel is always available
      if (!validFrom && !validUntil) return true;
      
      // Check if date is within valid range
      if (validFrom && date < validFrom) return false;
      if (validUntil && date > validUntil) return false;
      
      return true;
    });
  };

  // Get total available rooms for hotels on a date
  const getTotalRooms = (hotelsOnDate: Hotel[]): number => {
    return hotelsOnDate.reduce((sum, hotel) => {
      const rooms = hotel.hotel_rooms || [];
      return sum + rooms.reduce((roomSum, room) => 
        roomSum + ((room as any).available_rooms || (room as any).total_rooms || 10), 0
      );
    }, 0);
  };

  // Get availability status for a date
  const getAvailabilityStatus = (hotelsOnDate: Hotel[]) => {
    if (hotelsOnDate.length === 0) return 'unavailable';
    
    const totalRooms = getTotalRooms(hotelsOnDate);
    if (totalRooms === 0) return 'sold-out';
    if (totalRooms <= 5) return 'limited';
    return 'available';
  };

  // Get padding days for the start of the month
  const startPadding = getDay(startOfMonth(month));

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Hotel Availability - {format(month, 'MMMM yyyy')}
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
            const hotelsOnDate = getHotelsForDate(day);
            const status = getAvailabilityStatus(hotelsOnDate);
            const roomCount = getTotalRooms(hotelsOnDate);
            const isToday = isSameDay(day, new Date());
            const isPast = startOfDay(day) < startOfDay(new Date());
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateSelect?.(day, hotelsOnDate)}
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
                {hotelsOnDate.length > 0 && !isPast && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Building className="h-3 w-3" />
                    <span className="text-[10px]">{roomCount}</span>
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
            <span className="text-muted-foreground">Limited (≤5 rooms)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-red-500/30" />
            <span className="text-muted-foreground">Sold Out</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-secondary/50" />
            <span className="text-muted-foreground">Not Available</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component to show hotel validity badge
export function HotelValidityBadge({ validFrom, validUntil }: { validFrom?: string | null; validUntil?: string | null }) {
  if (!validUntil) return null;
  
  const endDate = new Date(validUntil);
  const today = new Date();
  const daysRemaining = differenceInDays(startOfDay(endDate), startOfDay(today));
  
  if (daysRemaining < 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        <Clock className="h-3 w-3 mr-1" />
        Expired
      </Badge>
    );
  }
  
  if (daysRemaining <= 7) {
    return (
      <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
        <Clock className="h-3 w-3 mr-1" />
        Expires in {daysRemaining} days
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="text-xs">
      Valid until {format(endDate, 'MMM dd, yyyy')}
    </Badge>
  );
}

// Helper component to show room inventory
export function RoomInventoryBadge({ availableRooms, totalRooms }: { availableRooms?: number; totalRooms?: number }) {
  const available = availableRooms ?? totalRooms ?? 10;
  const total = totalRooms ?? 10;
  
  if (available === 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        Sold Out
      </Badge>
    );
  }
  
  if (available <= 3) {
    return (
      <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
        <AlertCircle className="h-3 w-3 mr-1" />
        Only {available} left!
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className="text-xs">
      {available}/{total} rooms
    </Badge>
  );
}
