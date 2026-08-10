import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, DayPickerSingleProps, DayPickerMultipleProps, DayPickerRangeProps } from "react-day-picker";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export interface DayDetail {
  remaining?: number;
  sold?: number;
  capacity?: number;
}

type CalendarBaseProps = {
  availableDates?: Date[];
  limitedDates?: Date[];
  soldOutDates?: Date[];
  showLegend?: boolean;
  datePrices?: Record<string, number>;
  dayDetails?: Record<string, DayDetail>;
  cellSize?: 'md' | 'lg';
};

type AvailabilityCalendarProps = CalendarBaseProps & (
  | Omit<DayPickerSingleProps, 'mode'> & { mode?: 'single' }
  | Omit<DayPickerMultipleProps, 'mode'> & { mode: 'multiple' }
  | Omit<DayPickerRangeProps, 'mode'> & { mode: 'range' }
);

function AvailabilityCalendar({
  className,
  classNames,
  showOutsideDays = true,
  availableDates = [],
  limitedDates = [],
  soldOutDates = [],
  showLegend = true,
  datePrices = {},
  dayDetails,
  cellSize,
  mode = 'single',
  ...props
}: AvailabilityCalendarProps) {
  const hasPrices = Object.keys(datePrices).length > 0;
  const hasDetails = !!dayDetails && Object.keys(dayDetails).length > 0;
  const isLg = cellSize === 'lg' || hasDetails;

  const cellDims = isLg ? "h-[88px] w-[72px]" : hasPrices ? "h-14 w-12" : "h-9 w-9";
  const headDims = isLg ? "w-[72px]" : hasPrices ? "w-12" : "w-9";

  return (
    <div className="space-y-2">
      <DayPicker
        mode={mode as any}
        showOutsideDays={showOutsideDays}
        className={cn("p-3 pointer-events-auto", className)}
        classNames={{
          months: cn(
            "flex flex-col sm:flex-row space-y-4 sm:space-y-0",
            isLg ? "sm:space-x-8" : "sm:space-x-4"
          ),
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: cn("font-semibold", isLg ? "text-base" : "text-sm"),
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: cn(
            "text-muted-foreground rounded-md font-medium",
            isLg ? "text-xs py-1" : "text-[0.8rem] font-normal",
            headDims
          ),
          row: "flex w-full mt-2",
          cell: cn(
            "text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            cellDims
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "p-0 font-normal aria-selected:opacity-100",
            cellDims
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        modifiers={{
          available: availableDates,
          limited: limitedDates,
          soldOut: soldOutDates,
        }}
        modifiersClassNames={{
          available: "!bg-green-100 !text-green-800 hover:!bg-green-200 dark:!bg-green-900/30 dark:!text-green-400",
          soldOut: "!bg-red-100 !text-red-800 hover:!bg-red-200 dark:!bg-red-900/30 dark:!text-red-400",
        }}
        components={{
          IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
          IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
          ...(hasDetails ? {
            DayContent: ({ date }: { date: Date }) => {
              const key = format(date, "yyyy-MM-dd");
              const detail = dayDetails![key];
              const remaining = detail?.remaining;
              const sold = detail?.sold ?? 0;
              const capacity = detail?.capacity ?? 0;
              const remainingColor =
                remaining === undefined
                  ? "text-muted-foreground/60"
                  : remaining === 0
                    ? "bg-red-200/70 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                    : remaining <= 3
                      ? "bg-amber-200/70 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300"
                      : "bg-green-200/70 text-green-900 dark:bg-green-900/40 dark:text-green-300";
              return (
                <div className="flex flex-col items-center justify-start gap-1 pt-1 pb-1 leading-none w-full">
                  <span className="text-base font-semibold">{date.getDate()}</span>
                  {remaining !== undefined && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[11px] font-bold leading-none tracking-wide",
                      remainingColor
                    )}>
                      {capacity}/{sold}
                    </span>
                  )}
                </div>
              );
            },
          } : hasPrices ? {
            DayContent: ({ date }: { date: Date }) => {
              const key = format(date, "yyyy-MM-dd");
              const price = datePrices[key];
              return (
                <div className="flex flex-col items-center leading-none gap-0.5">
                  <span className="text-sm">{date.getDate()}</span>
                  {price !== undefined && (
                    <span className="text-[8px] font-bold text-primary leading-none">
                      ${price}
                    </span>
                  )}
                </div>
              );
            },
          } : {}),
        }}
        {...props as any}
      />
      {showLegend && (
        <div className="flex items-center justify-center gap-4 px-3 pb-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-green-100 dark:bg-green-900/30" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-red-100 dark:bg-red-900/30" />
            <span className="text-muted-foreground">Sold Out</span>
          </div>
        </div>
      )}
    </div>
  );
}

AvailabilityCalendar.displayName = "AvailabilityCalendar";

export { AvailabilityCalendar };
export type { AvailabilityCalendarProps };
