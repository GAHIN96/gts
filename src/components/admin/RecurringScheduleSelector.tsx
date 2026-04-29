import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface RecurringScheduleSelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

const WEEKDAYS = [
  { value: 0, label: "Sun", shortLabel: "S" },
  { value: 1, label: "Mon", shortLabel: "M" },
  { value: 2, label: "Tue", shortLabel: "T" },
  { value: 3, label: "Wed", shortLabel: "W" },
  { value: 4, label: "Thu", shortLabel: "T" },
  { value: 5, label: "Fri", shortLabel: "F" },
  { value: 6, label: "Sat", shortLabel: "S" },
];

export function RecurringScheduleSelector({ selectedDays, onChange }: RecurringScheduleSelectorProps) {
  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter(d => d !== day));
    } else {
      onChange([...selectedDays, day].sort());
    }
  };

  const selectPreset = (preset: 'weekdays' | 'weekend' | 'all') => {
    switch (preset) {
      case 'weekdays':
        onChange([1, 2, 3, 4, 5]);
        break;
      case 'weekend':
        onChange([0, 6]);
        break;
      case 'all':
        onChange([0, 1, 2, 3, 4, 5, 6]);
        break;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Recurring Days</Label>
      </div>
      
      {/* Quick Presets */}
      <div className="flex gap-2">
        <Badge 
          variant={selectedDays.length === 5 && !selectedDays.includes(0) && !selectedDays.includes(6) ? "default" : "outline"}
          className="cursor-pointer hover:bg-primary/80 transition-colors"
          onClick={() => selectPreset('weekdays')}
        >
          Weekdays
        </Badge>
        <Badge 
          variant={selectedDays.length === 2 && selectedDays.includes(0) && selectedDays.includes(6) ? "default" : "outline"}
          className="cursor-pointer hover:bg-primary/80 transition-colors"
          onClick={() => selectPreset('weekend')}
        >
          Weekends
        </Badge>
        <Badge 
          variant={selectedDays.length === 7 ? "default" : "outline"}
          className="cursor-pointer hover:bg-primary/80 transition-colors"
          onClick={() => selectPreset('all')}
        >
          Every Day
        </Badge>
      </div>

      {/* Day Checkboxes */}
      <div className="flex gap-2">
        {WEEKDAYS.map(day => (
          <button
            key={day.value}
            type="button"
            onClick={() => toggleDay(day.value)}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
              ${selectedDays.includes(day.value) 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }
            `}
          >
            {day.shortLabel}
          </button>
        ))}
      </div>

      {/* Selected Days Summary */}
      {selectedDays.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Operates every: {selectedDays.map(d => WEEKDAYS.find(w => w.value === d)?.label).join(", ")}
        </p>
      )}
    </div>
  );
}

// Helper function to format recurring schedule for display
export function formatRecurringSchedule(days: number[] | null): string {
  if (!days || days.length === 0) return '';
  
  const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Check for presets
  if (days.length === 7) return "Daily";
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return "Weekdays";
  if (days.length === 2 && days.includes(0) && days.includes(6)) return "Weekends";
  
  // Sort and format
  const sortedDays = [...days].sort();
  return sortedDays.map(d => WEEKDAY_NAMES[d]).join(", ");
}

// Badge component for displaying schedule
export function ScheduleBadge({ scheduleType, recurringDays, validUntil }: { 
  scheduleType?: string | null; 
  recurringDays?: number[] | null;
  validUntil?: string | null;
}) {
  if (scheduleType !== 'recurring' || !recurringDays || recurringDays.length === 0) {
    return null;
  }

  const scheduleText = formatRecurringSchedule(recurringDays);
  
  return (
    <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20">
      <RefreshCw className="h-3 w-3 mr-1" />
      {scheduleText}
      {validUntil && (
        <span className="ml-1 text-muted-foreground">
          until {format(new Date(validUntil), 'MMM dd')}
        </span>
      )}
    </Badge>
  );
}
