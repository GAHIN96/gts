import { Plane, Clock, Users, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MatchedFlight } from "@/hooks/useMatchingFlights";
import { format } from "date-fns";

interface FlightLinkingCardProps {
  flight: MatchedFlight;
  isSelected: boolean;
  onSelect: () => void;
  type: "outbound" | "return";
  requiredSeats?: number;
}

export function FlightLinkingCard({
  flight,
  isSelected,
  onSelect,
  type,
  requiredSeats,
}: FlightLinkingCardProps) {
  const getMatchBadge = (score: number) => {
    if (score >= 100) {
      return (
        <Badge className="bg-green-500/20 text-green-700 border-green-500/30 gap-1">
          <Sparkles className="h-3 w-3" />
          Perfect Match
        </Badge>
      );
    } else if (score >= 80) {
      return (
        <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Great Match
        </Badge>
      );
    } else if (score >= 60) {
      return (
        <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 gap-1">
          Good Match
        </Badge>
      );
    } else if (score > 0) {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          {flight.matchReason}
        </Badge>
      );
    }
    return null;
  };

  const formatTime = (time: string | null) => {
    if (!time) return "--:--";
    return time.slice(0, 5);
  };

  const needsSeatsWarning =
    typeof requiredSeats === "number" &&
    requiredSeats > 0 &&
    typeof flight.available_seats === "number" &&
    flight.available_seats < requiredSeats;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected
          ? "ring-2 ring-primary border-primary bg-primary/5"
          : "hover:border-primary/50"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        {needsSeatsWarning && (
          <div className="mb-3">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Low seat availability</AlertTitle>
              <AlertDescription>
                Flight has {flight.available_seats} seats, but this departure is set to {requiredSeats} seats.
              </AlertDescription>
            </Alert>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-3">
            {/* Header with airline and match badge */}
            <div className="flex items-center gap-2 flex-wrap">
              {flight.airline_logo ? (
                <img
                  src={flight.airline_logo}
                  alt={flight.airline}
                  className="h-6 w-6 object-contain"
                />
              ) : (
                <div className="h-6 w-6 bg-muted rounded-full flex items-center justify-center">
                  <Plane className="h-3 w-3" />
                </div>
              )}
              <span className="font-semibold text-sm">{flight.airline}</span>
              <span className="text-muted-foreground text-xs">
                {flight.flight_number}
              </span>
              {getMatchBadge(flight.matchScore)}
            </div>

            {/* Route and time */}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex-1">
                <div className="font-medium">
                  {flight.departure_city}
                  {(flight as any).departure_airport_code && (
                    <span className="text-xs text-muted-foreground ml-1 font-sans font-medium">
                      ({(flight as any).departure_airport_code})
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(flight.departure_time)}
                </div>
              </div>
              
              <div className="flex flex-col items-center flex-shrink-0">
                <Plane className={cn(
                  "h-4 w-4 text-muted-foreground",
                  type === "return" && "rotate-180"
                )} />
                <div className="text-[10px] text-muted-foreground">
                  {format(new Date(flight.departure_date), "dd/MM")}
                </div>
              </div>
              
              <div className="flex-1 text-right">
                <div className="font-medium">
                  {flight.arrival_city}
                  {(flight as any).arrival_airport_code && (
                    <span className="text-xs text-muted-foreground ml-1 font-sans font-medium">
                      ({(flight as any).arrival_airport_code})
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock className="h-3 w-3" />
                  {formatTime(flight.arrival_time)}
                </div>
              </div>
            </div>

            {/* Additional info */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {flight.available_seats} seats
              </div>
              {flight.class && (
                <Badge variant="outline" className="text-xs h-5">
                  {flight.class}
                </Badge>
              )}
              {flight.price && (
                <span className="font-medium text-foreground">
                  ${flight.price}
                </span>
              )}
            </div>
          </div>

          {/* Selection indicator */}
          <div className={cn(
            "h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30"
          )}>
            {isSelected && <CheckCircle2 className="h-4 w-4" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NoFlightsCard({ type, city }: { type: "outbound" | "return"; city: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-6 text-center">
        <Plane className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No {type} flights found for {city}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Add flights in the Flights section first
        </p>
      </CardContent>
    </Card>
  );
}
