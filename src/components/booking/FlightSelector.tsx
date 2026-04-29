import { useState } from "react";
import { 
  Plane, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Check,
  Users,
  Search,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Flight {
  id: string;
  airline: string;
  airline_logo?: string | null;
  flight_number?: string | null;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  departure_time?: string | null;
  arrival_date: string;
  arrival_time?: string | null;
  price: number;
  class?: string | null;
  available_seats?: number | null;
}

interface FlightSelectorProps {
  flights: Flight[];
  selectedFlightId: string | null;
  onSelectFlight: (flightId: string) => void;
  departureDate: Date;
  destination: string;
}

export function FlightSelector({
  flights,
  selectedFlightId,
  onSelectFlight,
  departureDate,
  destination,
}: FlightSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFlights = flights.filter(
    (flight) =>
      flight.airline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.departure_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.arrival_city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[hsl(231,70%,30%)] to-[hsl(231,50%,45%)] p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Plane className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Select Your Flight</h3>
            <p className="text-white/80 text-sm">Choose your preferred flight to {destination}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(231,15%,46%)]" />
          <Input
            placeholder="Search by airline or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl border-2 border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)]"
          />
        </div>

        {/* Flight Summary Header */}
        <div className="flex items-center gap-4 p-4 bg-[hsl(240,5%,96%)] rounded-xl mb-4">
          <Calendar className="h-5 w-5 text-[hsl(231,70%,30%)]" />
          <span className="font-medium text-[hsl(231,70%,15%)]">
            {format(departureDate, "dd/MM/yyyy")}
          </span>
        </div>

        {/* Flight List */}
        <div className="space-y-3">
          {filteredFlights.length === 0 ? (
            <div className="text-center py-12">
              <Plane className="h-12 w-12 text-[hsl(231,15%,46%)] mx-auto mb-4 opacity-50" />
              <p className="text-[hsl(231,15%,46%)] font-medium">No flights available</p>
              <p className="text-[hsl(231,15%,46%)] text-sm mt-1">
                {searchQuery ? "Try a different search" : "Check back later for available flights"}
              </p>
            </div>
          ) : (
            filteredFlights.map((flight) => {
              const isSelected = selectedFlightId === flight.id;
              const hasLimitedSeats = (flight.available_seats || 0) <= 10 && (flight.available_seats || 0) > 0;

              return (
                <div
                  key={flight.id}
                  onClick={() => onSelectFlight(flight.id)}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300",
                    isSelected
                      ? "border-[hsl(231,70%,30%)] bg-[hsl(231,70%,30%)]/5 shadow-lg"
                      : "border-[hsl(240,6%,90%)] hover:border-[hsl(231,70%,30%)]/50 hover:shadow-md"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Airline Logo */}
                    <div className="flex-shrink-0">
                      {flight.airline_logo ? (
                        <img
                          src={flight.airline_logo}
                          alt={flight.airline}
                          className="w-14 h-14 rounded-xl object-contain bg-white p-2 border border-[hsl(240,6%,90%)]"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-[hsl(231,70%,30%)]/10 flex items-center justify-center">
                          <Plane className="h-6 w-6 text-[hsl(231,70%,30%)]" />
                        </div>
                      )}
                    </div>

                    {/* Flight Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-[hsl(231,70%,15%)]">{flight.airline}</span>
                        {flight.flight_number && (
                          <Badge variant="secondary" className="text-xs">
                            {flight.flight_number}
                          </Badge>
                        )}
                        {flight.class && (
                          <Badge className="bg-[hsl(45,100%,51%)] text-black text-xs">
                            {flight.class}
                          </Badge>
                        )}
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-3 text-sm">
                        <div>
                          <p className="font-semibold text-[hsl(231,70%,15%)]">{flight.departure_city}</p>
                          <p className="text-[hsl(231,15%,46%)] text-xs">{(flight.departure_time || "--:--").substring(0, 5)}</p>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="h-0.5 flex-1 bg-[hsl(240,6%,90%)]" />
                          <ArrowRight className="h-4 w-4 text-[hsl(231,50%,45%)]" />
                          <div className="h-0.5 flex-1 bg-[hsl(240,6%,90%)]" />
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[hsl(231,70%,15%)]">{flight.arrival_city}</p>
                          <p className="text-[hsl(231,15%,46%)] text-xs">{(flight.arrival_time || "--:--").substring(0, 5)}</p>
                        </div>
                      </div>

                      {/* Availability warning */}
                      {hasLimitedSeats && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Users className="h-3.5 w-3.5 text-[hsl(6,100%,69%)]" />
                          <span className="text-xs font-medium text-[hsl(6,100%,50%)]">
                            Only {flight.available_seats} seats left!
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Price & Selection */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[hsl(231,70%,30%)]">
                          ${flight.price}
                        </p>
                        <p className="text-xs text-[hsl(231,15%,46%)]">per person</p>
                      </div>
                      
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        isSelected
                          ? "bg-[hsl(142,76%,36%)]"
                          : "border-2 border-[hsl(240,6%,90%)]"
                      )}>
                        {isSelected && <Check className="h-5 w-5 text-white" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}