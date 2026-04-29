import { Plane, Luggage, Clock, Calendar } from "lucide-react";
import { PlaneTakeoffIcon } from "@/components/icons/PlaneTakeoffIcon";
import { PlaneLandingIcon } from "@/components/icons/PlaneLandingIcon";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface DepartureInfo {
  departure_date: string;
  return_date: string;
  fl_number?: string | null;
  ret_fl_number?: string | null;
  departure_time?: string | null;
  dept_arr_time?: string | null;
  return_time?: string | null;
  ret_arr_time?: string | null;
  baggage?: string | null;
}

interface PackageInfo {
  airline?: string | null;
  source_airport?: string | null;
  destination_airport?: string | null;
}

interface CompactFlightCardsProps {
  departure?: DepartureInfo | null;
  pkg?: PackageInfo | null;
  airlineLogoUrl?: string | null;
  className?: string;
  onChangeFlights?: () => void;
}

export function CompactFlightCards({
  departure,
  pkg,
  airlineLogoUrl,
  className,
  onChangeFlights,
}: CompactFlightCardsProps) {
  const formatTime = (time: string | null | undefined) => {
    if (!time) return "--:--";
    return time.substring(0, 5);
  };

  if (!departure) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-border bg-muted/20 p-6", className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Round-Trip Flights</p>
            <p className="text-xs text-muted-foreground">Flight details will be confirmed shortly</p>
          </div>
        </div>
      </div>
    );
  }

  const airline = pkg?.airline || "Airline";
  const sourceAirport = pkg?.source_airport || "---";
  const destAirport = pkg?.destination_airport || "---";

  // Calculate duration between times
  const calcDuration = (dep: string | null | undefined, arr: string | null | undefined) => {
    if (!dep || !arr) return null;
    const [dh, dm] = dep.split(":").map(Number);
    const [ah, am] = arr.split(":").map(Number);
    let diff = (ah * 60 + am) - (dh * 60 + dm);
    if (diff < 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}m`;
  };

  // Check if arrival is next day
  const isNextDay = (dep: string | null | undefined, arr: string | null | undefined) => {
    if (!dep || !arr) return false;
    const [dh] = dep.split(":").map(Number);
    const [ah] = arr.split(":").map(Number);
    return ah < dh;
  };

  const FlightLeg = ({
    type,
    flightNumber,
    departureCode,
    arrivalCode,
    departureTime,
    arrivalTime,
    date,
  }: {
    type: "DEPARTURE" | "RETURN";
    flightNumber: string | null | undefined;
    departureCode: string;
    arrivalCode: string;
    departureTime: string | null | undefined;
    arrivalTime: string | null | undefined;
    date: string;
  }) => {
    const duration = calcDuration(departureTime, arrivalTime);
    const nextDay = isNextDay(departureTime, arrivalTime);

    return (
      <div className="border border-border/60 rounded-xl p-4 space-y-3 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            {type}
          </span>
          <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 rounded-md">
            Economy
          </Badge>
        </div>

        {/* Airline */}
        <div className="flex items-center gap-2">
          <Plane className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground uppercase">{airline}</span>
        </div>

        {/* Date */}
        <p className="text-xs text-muted-foreground font-medium">
          {format(new Date(date), "EEE, dd MMM yyyy")}
        </p>

        {/* Times */}
        <div className="flex items-end justify-between gap-2 pt-1">
          <div className="space-y-0.5">
            <p className="text-2xl font-black text-foreground tabular-nums leading-none">
              {formatTime(departureTime)}
            </p>
            <p className="text-xs text-muted-foreground font-medium">{departureCode}</p>
          </div>

          <div className="flex-1 flex flex-col items-center gap-1 px-2">
            {duration && (
              <span className="text-[10px] text-muted-foreground font-medium">{duration}</span>
            )}
            <div className="w-full flex items-center gap-1">
              <div className="flex-1 h-px bg-border" />
              <Plane className="h-3 w-3 text-muted-foreground rotate-45 shrink-0" />
              <div className="flex-1 h-px bg-border" />
            </div>
          </div>

          <div className="space-y-0.5 text-right">
            <div className="flex items-baseline gap-0.5 justify-end">
              <p className="text-2xl font-black text-foreground tabular-nums leading-none">
                {formatTime(arrivalTime)}
              </p>
              {nextDay && (
                <span className="text-[10px] text-primary font-bold">+1</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium">{arrivalCode}</p>
          </div>
        </div>

        {/* Baggage */}
        {departure.baggage && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
            <Luggage className="h-3 w-3" />
            <span>{departure.baggage}</span>
            {type === "DEPARTURE" && (
              <>
                <span className="mx-1">·</span>
                <span>🍽 Meal Included</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Airline Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <Plane className="h-4 w-4 text-primary-foreground" />
          </div>
          <h3 className="text-base font-bold text-foreground">Airline</h3>
        </div>
        {onChangeFlights && (
          <button
            onClick={onChangeFlights}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Change Flights
          </button>
        )}
      </div>

      {/* Flight legs side by side */}
      <div className="flex gap-3">
        <FlightLeg
          type="DEPARTURE"
          flightNumber={departure.fl_number}
          departureCode={sourceAirport}
          arrivalCode={destAirport}
          departureTime={departure.departure_time}
          arrivalTime={departure.dept_arr_time}
          date={departure.departure_date}
        />
        <FlightLeg
          type="RETURN"
          flightNumber={departure.ret_fl_number}
          departureCode={destAirport}
          arrivalCode={sourceAirport}
          departureTime={departure.return_time}
          arrivalTime={departure.ret_arr_time}
          date={departure.return_date}
        />
      </div>
    </div>
  );
}
