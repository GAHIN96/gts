import { format, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isAfter, startOfDay } from "date-fns";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
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

interface DepartureDatePickerProps {
  departures: Departure[];
  selectedDeparture: string | null;
  onSelect: (departureId: string) => void;
}

export function DepartureDatePicker({ departures, selectedDeparture, onSelect }: DepartureDatePickerProps) {
  const today = startOfDay(new Date());
  
  // Get the earliest future departure date or today
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

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="font-semibold text-lg">{format(currentMonth, "MMMM yyyy")}</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
        
        {/* Empty days */}
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="h-12" />
        ))}
        
        {/* Calendar Days */}
        {daysInMonth.map(day => {
          const departure = getDepartureForDay(day);
          const isSelected = departure && departure.id === selectedDeparture;
          const isPast = !isAfter(day, today) && !isSameDay(day, today);
          
          return (
            <div
              key={day.toString()}
              className={cn(
                "h-12 flex flex-col items-center justify-center rounded-lg text-sm relative",
                isPast && "text-muted-foreground/40",
                departure && !isPast && "cursor-pointer",
                departure && !isPast && !isSelected && "bg-primary/10 hover:bg-primary/20 text-primary font-medium",
                isSelected && "bg-primary text-primary-foreground font-semibold",
                !departure && !isPast && "text-muted-foreground"
              )}
              onClick={() => departure && !isPast && onSelect(departure.id)}
            >
              <span>{format(day, "d")}</span>
              {departure && !isPast && (
                <span className={cn(
                  "text-[10px] leading-none",
                  isSelected ? "text-primary-foreground/80" : "text-primary"
                )}>
                  ${departure.price_per_person}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary/10 border border-primary/30" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Selected</span>
        </div>
      </div>

      {/* Selected Departure Details */}
      {selectedDep && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Selected Departure</span>
            <Badge className={selectedDep.available_seats > 5 ? "bg-success/10 text-success" : "bg-coral/10 text-coral"}>
              <Users className="h-3 w-3 mr-1" />
              {selectedDep.available_seats} seats left
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Departure</p>
              <p className="font-medium">{format(new Date(selectedDep.departure_date), "dd/MM/yyyy")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Return</p>
              <p className="font-medium">{format(new Date(selectedDep.return_date), "dd/MM/yyyy")}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-medium">Price per person</span>
            <span className="text-xl font-bold text-primary">${selectedDep.price_per_person}</span>
          </div>
        </div>
      )}
    </div>
  );
}
