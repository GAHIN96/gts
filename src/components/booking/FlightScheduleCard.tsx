import { Plane, Clock, Calendar, MapPin, Users, ArrowRight, Luggage, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import type { DepartureFlight } from "@/hooks/usePackageDepartureFlights";
import type { SuggestedFlight } from "@/hooks/useSuggestedRoundTripFlights";

interface FlightScheduleCardProps {
  outboundFlight?: DepartureFlight;
  returnFlight?: DepartureFlight;
  suggestedOutbound?: SuggestedFlight | null;
  suggestedReturn?: SuggestedFlight | null;
  destinationName?: string;
  className?: string;
}

export function FlightScheduleCard({
  outboundFlight,
  returnFlight,
  suggestedOutbound,
  suggestedReturn,
  destinationName,
  className,
}: FlightScheduleCardProps) {
  const hasLinkedFlights = !!outboundFlight?.flights || !!returnFlight?.flights;
  const hasSuggestedFlights = !!suggestedOutbound || !!suggestedReturn;

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "EEE, MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return "--:--";
    // Handle both HH:mm and HH:mm:ss formats
    return time.substring(0, 5);
  };

  const outbound = outboundFlight?.flights ?? suggestedOutbound ?? null;
  const inbound = returnFlight?.flights ?? suggestedReturn ?? null;

  if (!hasLinkedFlights && !hasSuggestedFlights) {
    return (
      <div className={cn("bg-card rounded-2xl shadow-lg border border-border overflow-hidden", className)}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Round-Trip Flights</h3>
              <p className="text-white/80 text-sm">Included in your package</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Flight details not available</AlertTitle>
            <AlertDescription>
              No flights are linked (or suggested) for this departure yet. Please ask the admin to link the outbound and
              return flights so the exact times are shown here.
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <p className="font-semibold text-foreground text-lg">Route</p>
            <p className="text-muted-foreground mt-1">Erbil ↔ {destinationName || "Destination"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card rounded-2xl shadow-lg border border-border overflow-hidden", className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Flight Schedule</h3>
              <p className="text-white/80 text-sm">Round-trip flights included</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
            Round-Trip
          </Badge>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Outbound Flight */}
        {outbound && (
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Plane className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                  Departure
                </Badge>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 rounded-2xl p-5 border border-blue-200/50 dark:border-blue-800/30">
              {/* Airline Info */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-blue-200/50 dark:border-blue-800/30">
                {outbound.airline_logo ? (
                  <img
                    src={outbound.airline_logo}
                    alt={outbound.airline}
                    className="w-12 h-12 rounded-lg object-contain bg-white p-1.5 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                    <Plane className="h-5 w-5 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-foreground">{outbound.airline}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {outbound.flight_number || "Flight TBD"}
                    </Badge>
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">{formatDate(outbound.departure_date)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Arrives: {formatDate(outbound.arrival_date)}
                  </div>
                </div>
              </div>

              {/* Route Display */}
              <div className="flex items-center gap-4">
                {/* Departure */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Departure</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{outbound.departure_city}</p>
                  {(outbound as any).departure_airport_code && (
                    <Badge variant="outline" className="mt-1 text-xs font-mono">
                      {(outbound as any).departure_airport_code}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold text-blue-600">{formatTime(outbound.departure_time)}</span>
                  </div>
                </div>

                {/* Flight Path Visual */}
                <div className="flex-shrink-0 flex flex-col items-center px-4">
                  <div className="w-24 h-0.5 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-card rounded-full p-1.5 shadow-md">
                      <Plane className="h-4 w-4 text-blue-600 rotate-90" />
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-blue-400 mt-2" />
                </div>

                {/* Arrival */}
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Arrival</span>
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{outbound.arrival_city}</p>
                  {(outbound as any).arrival_airport_code && (
                    <Badge variant="outline" className="mt-1 text-xs font-mono">
                      {(outbound as any).arrival_airport_code}
                    </Badge>
                  )}
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="text-lg font-semibold text-foreground">{formatTime(outbound.arrival_time)}</span>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Return Flight */}
        {inbound && (
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Plane className="h-4 w-4 text-green-600 rotate-180" />
              </div>
              <div>
                <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
                  Return
                </Badge>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 rounded-2xl p-5 border border-green-200/50 dark:border-green-800/30">
              {/* Airline Info */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-green-200/50 dark:border-green-800/30">
                {inbound.airline_logo ? (
                  <img
                    src={inbound.airline_logo}
                    alt={inbound.airline}
                    className="w-12 h-12 rounded-lg object-contain bg-white p-1.5 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center shadow-sm">
                    <Plane className="h-5 w-5 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-foreground">{inbound.airline}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {inbound.flight_number || "Flight TBD"}
                    </Badge>
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">{formatDate(inbound.departure_date)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Arrives: {formatDate(inbound.arrival_date)}
                  </div>
                </div>
              </div>

              {/* Route Display */}
              <div className="flex items-center gap-4">
                {/* Departure */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Departure</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{inbound.departure_city}</p>
                  {(inbound as any).departure_airport_code && (
                    <Badge variant="outline" className="mt-1 text-xs font-mono">
                      {(inbound as any).departure_airport_code}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold text-green-600">{formatTime(inbound.departure_time)}</span>
                  </div>
                </div>

                {/* Flight Path Visual */}
                <div className="flex-shrink-0 flex flex-col items-center px-4">
                  <div className="w-24 h-0.5 bg-gradient-to-r from-green-300 via-green-500 to-green-300 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-card rounded-full p-1.5 shadow-md">
                      <Plane className="h-4 w-4 text-green-600 rotate-90" />
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-green-400 mt-2" />
                </div>

                {/* Arrival */}
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Arrival</span>
                    <MapPin className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">{inbound.arrival_city}</p>
                  {(inbound as any).arrival_airport_code && (
                    <Badge variant="outline" className="mt-1 text-xs font-mono">
                      {(inbound as any).arrival_airport_code}
                    </Badge>
                  )}
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="text-lg font-semibold text-foreground">{formatTime(inbound.arrival_time)}</span>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Flight Summary Footer */}
        <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Luggage className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Baggage included</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">All passengers</span>
            </div>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            ✓ Included in package
          </Badge>
        </div>
      </div>
    </div>
  );
}
