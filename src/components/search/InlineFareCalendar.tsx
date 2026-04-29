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
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InlineFareCalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  datePrices?: Record<string, number>;
  availableDates?: Date[];
  limitedDates?: Date[];
  soldOutDates?: Date[];
  /** Added to each date's price for display (e.g. outbound price for return calendar) */
  addOnPrice?: number;
  /** Label shown above the add-on breakdown */
  addOnLabel?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function InlineFareCalendar({
  selected,
  onSelect,
  disabled,
  datePrices = {},
  availableDates = [],
  limitedDates = [],
  soldOutDates = [],
  addOnPrice = 0,
  addOnLabel,
}: InlineFareCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date());
  const today = startOfDay(new Date());

  const globalCheapest = useMemo(() => {
    const prices = Object.values(datePrices);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [datePrices]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startPadding = getDay(monthStart);
    const paddedDays: (Date | null)[] = Array(startPadding).fill(null);
    paddedDays.push(...days);
    while (paddedDays.length % 7 !== 0) paddedDays.push(null);
    return paddedDays;
  }, [currentMonth]);

  const availableSet = useMemo(() => new Set(availableDates.map(d => format(d, "yyyy-MM-dd"))), [availableDates]);
  const limitedSet = useMemo(() => new Set(limitedDates.map(d => format(d, "yyyy-MM-dd"))), [limitedDates]);
  const soldOutSet = useMemo(() => new Set(soldOutDates.map(d => format(d, "yyyy-MM-dd"))), [soldOutDates]);

  const getPriceBg = (price: number, dateKey: string): string => {
    if (soldOutSet.has(dateKey)) return "bg-destructive/10";
    if (price === globalCheapest) return "bg-success/15";
    if (price <= globalCheapest * 1.3) return "bg-success/5";
    if (price <= globalCheapest * 1.6) return "bg-warning/10";
    return "bg-muted/30";
  };

  const getPriceColor = (price: number): string => {
    if (price === globalCheapest) return "text-success font-bold";
    if (price <= globalCheapest * 1.3) return "text-success";
    if (price <= globalCheapest * 1.6) return "text-warning";
    return "text-muted-foreground";
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="p-3 w-[320px]">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          disabled={isSameMonth(currentMonth, new Date())}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-2 text-[9px]">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-success/20 border border-success/40" />
          <span className="text-muted-foreground">Cheap</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-warning/20 border border-warning/40" />
          <span className="text-muted-foreground">Mid</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-destructive/20 border border-destructive/40" />
          <span className="text-muted-foreground">Sold out</span>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="h-[52px]" />;

          const dateKey = format(day, "yyyy-MM-dd");
          const price = datePrices[dateKey];
          const isPast = isBefore(day, today);
          const isDisabled = isPast || (disabled ? disabled(day) : false) || soldOutSet.has(dateKey);
          const isSelected = selected && isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          const hasPrice = price !== undefined;
          const displayPrice = hasPrice ? price + addOnPrice : undefined;
          const showTooltip = hasPrice && !isDisabled && addOnPrice > 0;

          const cellContent = (
            <button
              key={dateKey}
              disabled={isDisabled}
              onClick={() => onSelect?.(day)}
              className={cn(
                "h-[52px] rounded-lg flex flex-col items-center justify-center transition-all text-center relative",
                isDisabled && "opacity-30 cursor-not-allowed",
                !isDisabled && "hover:ring-2 hover:ring-primary/40 cursor-pointer",
                isSelected && "ring-2 ring-primary bg-primary/10",
                !isSelected && hasPrice && !isDisabled && getPriceBg(price, dateKey),
                !isSelected && !hasPrice && !isDisabled && "hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-medium leading-none",
                  isToday && "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]",
                  isSelected && !isToday && "text-primary font-bold",
                  !isToday && !isSelected && "text-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              {hasPrice && !isDisabled ? (
                <span className={cn("text-[10px] leading-none mt-0.5", addOnPrice > 0 ? "font-bold text-primary" : getPriceColor(price))}>
                  ${displayPrice}
                </span>
              ) : limitedSet.has(dateKey) && !isDisabled ? (
                <span className="text-[9px] text-warning leading-none mt-0.5">Limited</span>
              ) : soldOutSet.has(dateKey) ? (
                <span className="text-[9px] text-destructive leading-none mt-0.5">Full</span>
              ) : null}
            </button>
          );

          if (showTooltip) {
            return (
              <Tooltip key={dateKey}>
                <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
                <TooltipContent side="top" className="text-[11px] p-2 space-y-0.5">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Departure</span>
                    <span className="font-semibold">${addOnPrice}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Return</span>
                    <span className="font-semibold">${price}</span>
                  </div>
                  <div className="border-t border-border/50 pt-0.5 flex justify-between gap-4">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="font-bold text-primary">${displayPrice}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }

          return cellContent;
        })}
      </div>

      {/* Add-on breakdown */}
      {addOnPrice > 0 && addOnLabel && (
        <div className="mt-2 px-1 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{addOnLabel}</span>
            <span className="font-semibold text-foreground">${addOnPrice}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>+ Return flight</span>
            <span className="text-muted-foreground">shown below</span>
          </div>
          <div className="border-t border-primary/10 mt-1 pt-1 flex items-center justify-between text-[10px]">
            <span className="font-semibold text-foreground">Total per person</span>
            <span className="font-bold text-primary">in calendar</span>
          </div>
        </div>
      )}

      {/* Cheapest indicator */}
      {globalCheapest > 0 && (
        <div className="mt-2 text-center text-[10px] text-muted-foreground">
          {addOnPrice > 0 ? (
            <>Cheapest total: <span className="font-bold text-success">${globalCheapest + addOnPrice}</span></>
          ) : (
            <>Cheapest: <span className="font-bold text-success">${globalCheapest}</span></>
          )}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
