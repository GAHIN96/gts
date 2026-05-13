import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isAfter, startOfDay, differenceInDays } from "date-fns";
import { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Moon,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Departure {
  id: string;
  departure_date: string;
  return_date: string;
  price_per_person: number;
  available_seats: number;
  total_seats: number;
  is_active: boolean | null;
}

interface AvailabilityCalendarProps {
  departures: Departure[];
  selectedDeparture: string | null;
  onSelect: (departureId: string) => void;
  onSearch?: () => void;
  showSearchButton?: boolean;
  fallbackPrice?: number;
}

export function AvailabilityCalendar({ 
  departures, 
  selectedDeparture, 
  onSelect, 
  onSearch,
  showSearchButton = false,
  fallbackPrice = 0
}: AvailabilityCalendarProps) {
  const today = startOfDay(new Date());
  
  const futureDepartures = departures.filter(d => d.is_active && isAfter(new Date(d.departure_date), today));
  const initialMonth = futureDepartures.length > 0 
    ? startOfMonth(new Date(futureDepartures[0].departure_date))
    : startOfMonth(today);
  
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(firstDayOfMonth).fill(null);

  const getDepartureForDay = (day: Date) => {
    return departures.find(dep => 
      dep.is_active && 
      isSameDay(new Date(dep.departure_date), day) &&
      isAfter(new Date(dep.departure_date), today)
    );
  };

  const selectedDep = departures.find(d => d.id === selectedDeparture);
  
  const getPackageNights = (dep: Departure) => {
    const start = new Date(dep.departure_date);
    const end = new Date(dep.return_date);
    return differenceInDays(end, start);
  };

  const isInSelectedRange = (day: Date) => {
    if (!selectedDep) return false;
    const depDate = new Date(selectedDep.departure_date);
    const retDate = new Date(selectedDep.return_date);
    return (isAfter(day, depDate) || isSameDay(day, depDate)) && 
           (isAfter(retDate, day) || isSameDay(day, retDate));
  };

  const isReturnDate = (day: Date) => {
    if (!selectedDep) return false;
    return isSameDay(day, new Date(selectedDep.return_date));
  };

  const isDepartureDate = (day: Date) => {
    if (!selectedDep) return false;
    return isSameDay(day, new Date(selectedDep.departure_date));
  };

  return (
    <div className="animate-[fade-in_0.3s_ease-out]">
      {/* Calendar */}
      <div className="p-4">
        {/* Month Navigation - Compact */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-muted"
            onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <span className="font-semibold text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-muted"
            onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day, i) => (
            <div key={`${day}-${i}`} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-2">
              {day}
            </div>
          ))}
          
          {/* Empty days */}
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="h-14" />
          ))}
          
          {/* Calendar Days */}
          {daysInMonth.map(day => {
            const departure = getDepartureForDay(day);
            const isSelected = departure && departure.id === selectedDeparture;
            const isPast = !isAfter(day, today) && !isSameDay(day, today);
            const hasAvailability = departure && departure.available_seats > 0;
            const inSelectedRange = isInSelectedRange(day);
            const isReturn = isReturnDate(day);
            const isLowAvailability = departure && departure.available_seats <= 5;
            
            return (
              <div
                key={day.toString()}
                className={cn(
                  "h-14 flex flex-col items-center justify-center rounded-lg text-xs relative transition-all duration-200",
                  isPast && "text-muted-foreground/30",
                  departure && !isPast && "cursor-pointer",
                  // Available dates - dark blue (primary)
                  hasAvailability && !isPast && !isSelected && !isReturn && !isLowAvailability && "bg-primary/10 dark:bg-primary/20 text-primary font-medium hover:bg-primary/20 dark:hover:bg-primary/30 border border-primary/20",
                  // Selected departure date
                  isSelected && "bg-primary text-primary-foreground font-semibold shadow-md border border-primary",
                  // In range
                  inSelectedRange && !isSelected && !isReturn && "bg-primary/5",
                  // Return date
                  isReturn && !isSelected && "bg-primary/10 text-primary font-medium border border-primary/20",
                  // Regular days
                  !departure && !isPast && !inSelectedRange && !isReturn && "text-muted-foreground hover:bg-muted/50"
                )}
                onClick={() => departure && !isPast && onSelect(departure.id)}
              >
                <span className="text-sm font-semibold leading-none">
                  {format(day, "d")}
                </span>
                
                {/* Inline price - more visible */}
                {hasAvailability && !isPast && (
                  <span className={cn(
                    "text-[9px] leading-none mt-0.5 font-bold",
                    isSelected ? "text-primary-foreground/90" : isLowAvailability ? "text-amber-600 dark:text-amber-400" : "text-primary"
                  )}>
                    ${departure.price_per_person || fallbackPrice}
                  </span>
                )}
                
                {/* Departure badge */}
                {isSelected && (
                  <Badge className="absolute -top-1.5 -right-1.5 text-[7px] px-1 py-0 h-3.5 bg-white text-primary border-0 shadow font-bold">
                    Departure
                  </Badge>
                )}
                
                {/* Return badge */}
                {isReturn && !isSelected && (
                  <Badge className="absolute -top-1.5 -right-1.5 text-[7px] px-1 py-0 h-3.5 bg-white text-primary border-0 shadow font-bold">
                    Return
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-primary/15 border border-primary/30" />
            <span className="text-[10px] text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-primary" />
            <span className="text-[10px] text-muted-foreground">Selected</span>
          </div>
        </div>
      </div>

      {/* Trip Summary */}
      {selectedDep && (
        <div className="px-4 pb-4 animate-[fade-in_0.2s_ease-out]">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3">
              {/* Trip info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-primary/30 bg-primary/10 text-primary">
                    Departure
                  </Badge>
                  <span className="text-xs font-medium text-foreground">
                    {format(new Date(selectedDep.departure_date), "dd/MM/yyyy")}
                  </span>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-primary/20 bg-primary/5 text-primary">
                    Return
                  </Badge>
                  <span className="text-xs font-medium text-foreground">
                    {format(new Date(selectedDep.return_date), "dd/MM/yyyy")}
                  </span>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Moon className="h-3 w-3" />
                  <span className="text-[10px] font-medium">{getPackageNights(selectedDep)}N</span>
                </div>
                <div className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span className="text-[10px] font-medium">{selectedDep.available_seats}</span>
                </div>
                <div className="w-px h-3 bg-border" />
                <span className="text-sm font-bold text-primary">${selectedDep.price_per_person || fallbackPrice}/pp</span>
              </div>
            </div>
            
            {showSearchButton && onSearch && (
              <Button
                onClick={onSearch}
                size="sm"
                className="w-full mt-3 h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
