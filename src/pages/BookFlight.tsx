import { formatCurrency } from '@/utils/currency';
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Plane, MapPin, Calendar, Clock, Users, ArrowLeft, ArrowRight, ArrowLeftRight, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCreateBooking } from "@/hooks/useBookings";
import { UniversalVoucher } from "@/components/booking/UniversalVoucher";
import { PassengerDetailsForm, PassengerFormData } from "@/components/booking/PassengerDetailsForm";
import { useFlights } from "@/hooks/useFlights";
import { useFlightDefaultFares, useFlightSpecialFares, useBulkFlightDefaultFares, useBulkFlightSpecialFares, FlightDefaultFare, FlightSpecialFare } from "@/hooks/useFlightFares";
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

/** Find the best matching fare: special (date-matched) first, then default, then base price */
function getEffectiveFare(
  basePricePerSeat: number,
  availSeats: number,
  departureDate: string,
  defaultFares: FlightDefaultFare[],
  specialFares: FlightSpecialFare[],
  personType?: string
): { rate: number; commission: number; source: string; personType: string } {
  const flightDateStr = departureDate ? departureDate.split('T')[0] : "";
  
  const matchTier = (f: { seat_from: number; seat_to: number }) => {
    const lo = Math.min(f.seat_from, f.seat_to);
    const hi = Math.max(f.seat_from, f.seat_to);
    return availSeats >= lo && availSeats <= hi;
  };
  
  // If a specific person type is requested, match it
  if (personType) {
    const matchingSpecial = specialFares.find(
      (f) => {
        const fromStr = f.from_date ? f.from_date.split('T')[0] : "";
        const toStr = f.to_date ? f.to_date.split('T')[0] : "";
        return (f.person_type || "Adult").toLowerCase() === personType.toLowerCase() &&
        matchTier(f) &&
        flightDateStr >= fromStr &&
        flightDateStr <= toStr;
      }
    );
    if (matchingSpecial) {
      return { rate: matchingSpecial.rate, commission: matchingSpecial.commission, source: "special", personType: matchingSpecial.person_type };
    }
    const matchingDefault = defaultFares.find(
      (f) =>
        (f.person_type || "Adult").toLowerCase() === personType.toLowerCase() &&
        matchTier(f)
    );
    if (matchingDefault) {
      return { rate: matchingDefault.rate, commission: matchingDefault.commission, source: "default", personType: matchingDefault.person_type };
    }
  }

  // No specific type - find any matching fare by seat range
  const anySpecial = specialFares.find(
    (f) => {
      const fromStr = f.from_date ? f.from_date.split('T')[0] : "";
      const toStr = f.to_date ? f.to_date.split('T')[0] : "";
      return matchTier(f) && flightDateStr >= fromStr && flightDateStr <= toStr;
    }
  );
  if (anySpecial) {
    return { rate: anySpecial.rate, commission: anySpecial.commission, source: "special", personType: anySpecial.person_type };
  }

  const anyDefault = defaultFares.find((f) => matchTier(f));
  if (anyDefault) {
    return { rate: anyDefault.rate, commission: anyDefault.commission, source: "default", personType: anyDefault.person_type };
  }

  return { rate: basePricePerSeat, commission: 0, source: "base", personType: personType || "Adult" };
}

const BookFlight = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const passengerCount = parseInt(searchParams.get("passengers") || "1", 10);
  const returnFlightId = searchParams.get("returnFlightId");
  const multiCityLegsParam = searchParams.get("multiCityLegs");
  const paxAdults = parseInt(searchParams.get("adults") || String(passengerCount), 10);
  const paxChildren = parseInt(searchParams.get("children") || "0", 10);
  const paxInfants = parseInt(searchParams.get("infants") || "0", 10);

  const multiCityLegIds = useMemo(() => {
    return multiCityLegsParam ? multiCityLegsParam.split(",").filter(Boolean) : [];
  }, [multiCityLegsParam]);

  const { data: flights, isLoading } = useFlights();
  const flight = flights?.find((f) => f.id === id) ?? null;
  const returnFlight = returnFlightId ? flights?.find((f) => f.id === returnFlightId) ?? null : null;

  const multiCityFlights = useMemo(() => {
    if (!flights || multiCityLegIds.length === 0) return [];
    return multiCityLegIds.map(legId => flights.find(f => f.id === legId)).filter(Boolean) as Flight[];
  }, [flights, multiCityLegIds]);

  // Redirect/Validation: If outbound is a package flight, they MUST book it with a return flight.
  useEffect(() => {
    if (!isLoading && flight) {
      const isPackage = flight.trip_type === "round_trip" || flight.linked_flight_id;
      if (isPackage && !returnFlightId && multiCityLegIds.length === 0) {
        toast.error("This flight is part of a round-trip package deal and cannot be booked individually.");
        navigate("/flights");
      }
    }
  }, [flight, isLoading, returnFlightId, multiCityLegIds, navigate]);

  const allFlightIds = useMemo(() => {
    const ids: string[] = [];
    if (flight?.id) ids.push(flight.id);
    if (returnFlight?.id) ids.push(returnFlight.id);
    multiCityFlights.forEach(f => ids.push(f.id));
    return ids;
  }, [flight, returnFlight, multiCityFlights]);

  // Bulk Fetch fares for all flights in the route/legs
  const { data: bulkDefaultFares = {} } = useBulkFlightDefaultFares(allFlightIds);
  const { data: bulkSpecialFares = {} } = useBulkFlightSpecialFares(allFlightIds);

  // Fetch fares for outbound (retaining for compatibility)
  const { data: outDefaultFares = [] } = useFlightDefaultFares(flight?.id || null);
  const { data: outSpecialFares = [] } = useFlightSpecialFares(flight?.id || null);
  // Fetch fares for return (retaining for compatibility)
  const { data: retDefaultFares = [] } = useFlightDefaultFares(returnFlight?.id || null);
  const { data: retSpecialFares = [] } = useFlightSpecialFares(returnFlight?.id || null);

  const [bookingResult, setBookingResult] = useState<{
    id: string;
    number: string;
    passengerData: PassengerFormData;
  } | null>(null);
  const createBooking = useCreateBooking();

  const isRoundTrip = !!returnFlight;
  const outAvailSeats = flight?.available_seats ?? flight?.total_seats ?? 100;
  const retAvailSeats = returnFlight?.available_seats ?? returnFlight?.total_seats ?? 100;

  // Required documents from flight settings (set in General tab)
  const requiredDocuments: string[] = Array.isArray((flight as any)?.required_documents)
    ? (flight as any).required_documents
    : [];

  // Calculate effective fares using fare hierarchy
  // Build fare lines from all defined fare types
  const buildFareLines = () => {
    if (!flight) return [];
    
    const lines: { personType: string; rate: number; commission: number; count: number }[] = [];
    
    let currentOutAvail = outAvailSeats;
    let currentRetAvail = retAvailSeats;
    const initialMultiAvail: Record<string, number> = {};
    for (const f of multiCityFlights) {
      initialMultiAvail[f.id] = f.available_seats ?? f.total_seats ?? 100;
    }
    
    const addLine = (type: string, count: number) => {
      if (count <= 0) return;
      
      const typeGroups = new Map<string, { rate: number, commission: number, count: number }>();
      
      for (let i = 0; i < count; i++) {
        let rate = 0;
        let commission = 0;
        
        if (multiCityFlights.length > 0) {
          const allLegs = [flight, ...multiCityFlights];
          for (const leg of allLegs) {
            const currentAvail = leg.id === flight.id ? currentOutAvail : initialMultiAvail[leg.id];
            const legDefs = bulkDefaultFares[leg.id] || [];
            const legSpecs = bulkSpecialFares[leg.id] || [];
            const fare = getEffectiveFare(leg.price, currentAvail, leg.departure_date, legDefs, legSpecs, type);
            rate += fare.rate;
            commission += fare.commission;
            
            if (type !== "Infant") {
              if (leg.id === flight.id) {
                if (currentOutAvail > 0) currentOutAvail--;
              } else {
                if (initialMultiAvail[leg.id] > 0) initialMultiAvail[leg.id]--;
              }
            }
          }
        } else {
          const outFare = getEffectiveFare(flight.price, currentOutAvail, flight.departure_date, outDefaultFares, outSpecialFares, type);
          const retFare = returnFlight
            ? getEffectiveFare(returnFlight.price, currentRetAvail, returnFlight.departure_date, retDefaultFares, retSpecialFares, type)
            : { rate: 0, commission: 0, source: "base", personType: type };
          const isExplicitPair = (flight.trip_type === "round_trip" || flight.linked_flight_id) && returnFlight;
          
          rate = isExplicitPair ? outFare.rate : outFare.rate + retFare.rate;
          commission = isExplicitPair ? outFare.commission : outFare.commission + retFare.commission;
          
          if (type !== "Infant") {
            if (currentOutAvail > 0) currentOutAvail--;
            if (currentRetAvail > 0) currentRetAvail--;
          }
        }
        
        const key = `${rate}-${commission}`;
        if (!typeGroups.has(key)) {
          typeGroups.set(key, { rate, commission, count: 1 });
        } else {
          typeGroups.get(key)!.count += 1;
        }
      }
      
      typeGroups.forEach(group => {
        lines.push({ 
          personType: type, 
          rate: group.rate, 
          commission: group.commission, 
          count: group.count 
        });
      });
    };
    
    if (paxAdults > 0 || paxChildren > 0 || paxInfants > 0) {
      addLine("Adult", paxAdults);
      addLine("Child", paxChildren);
      addLine("Infant", paxInfants);
    } else {
      addLine("Adult", passengerCount);
    }
    
    return lines;
  };

  // Build passenger categories array for form labeling
  const passengerCategories: string[] = [];
  for (let i = 0; i < paxAdults; i++) passengerCategories.push("Adult");
  for (let i = 0; i < paxChildren; i++) passengerCategories.push("Child");
  for (let i = 0; i < paxInfants; i++) passengerCategories.push("Infant");

  const fareLines = buildFareLines();
  
  // Use first fare line for main pricing (backward compat)
  const outboundFare = flight
    ? getEffectiveFare(flight.price, outAvailSeats, flight.departure_date, outDefaultFares, outSpecialFares)
    : { rate: 0, commission: 0, source: "base", personType: "Adult" };
  const returnFare = returnFlight
    ? getEffectiveFare(returnFlight.price, retAvailSeats, returnFlight.departure_date, retDefaultFares, retSpecialFares)
    : { rate: 0, commission: 0, source: "base", personType: "Adult" };

  const isExplicitRoundTrip = (flight?.trip_type === "round_trip" || flight?.linked_flight_id) && returnFlight;
  const ratePerPerson = isExplicitRoundTrip ? outboundFare.rate : outboundFare.rate + returnFare.rate;
  const commissionPerPerson = isExplicitRoundTrip ? outboundFare.commission : outboundFare.commission + returnFare.commission;
  const totalPrice = fareLines.reduce((sum, fl) => sum + fl.rate * fl.count, 0) || passengerCount * ratePerPerson;
  const totalCommission = fareLines.reduce((sum, fl) => sum + fl.commission * fl.count, 0) || passengerCount * commissionPerPerson;
  const netAmount = totalPrice - totalCommission;

  const handlePassengerSubmit = async (passengerData: PassengerFormData) => {
    if (!flight) return;

    try {
      const metadata: Record<string, any> = {};
      if (returnFlight) {
        metadata.returnFlightId = returnFlight.id;
        metadata.returnAirline = returnFlight.airline;
        metadata.returnFlightNumber = returnFlight.return_flight_number || returnFlight.departure_flight_number || returnFlight.flight_number;
        metadata.returnDepartureCity = returnFlight.departure_city;
        metadata.returnArrivalCity = returnFlight.arrival_city;
        metadata.returnDepartureDate = returnFlight.departure_date;
        metadata.returnDepartureTime = returnFlight.departure_time;
        metadata.returnArrivalTime = returnFlight.arrival_time;
        metadata.returnPrice = returnFlight.price;
        metadata.isRoundTrip = true;
      }

      if (multiCityFlights.length > 0) {
        metadata.isMultiCity = true;
        metadata.multiCityLegs = multiCityFlights.map(f => ({
          flightId: f.id,
          airline: f.airline,
          flightNumber: f.departure_flight_number || f.flight_number,
          departureCity: f.departure_city,
          arrivalCity: f.arrival_city,
          departureDate: f.departure_date,
          departureTime: f.departure_time,
          arrivalTime: f.arrival_time,
          price: f.price
        }));
      }

      // Infants don't occupy a seat — only count adults + children for seat deduction
      const seatPassengers = paxAdults + paxChildren;

      const booking = await createBooking.mutateAsync({
        booking_type: "flight",
        flight_id: flight.id,
        total_amount: totalPrice,
        passengers: seatPassengers || passengerCount,
        passenger_details: passengerData.passengers.map((p, index) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          passportNumber: p.passportNumber,
          passportExpiry: p.passportExpiry,
          dateOfBirth: p.dateOfBirth,
          nationality: p.nationality,
          documents: p.documents || [],
          isLead: index === 0,
        })),
        special_requests: passengerData.specialRequests,
        notes: JSON.stringify({
          contactEmail: passengerData.contactEmail,
          contactPhone: passengerData.contactPhone,
        }),
        metadata: {
          ...metadata,
          infantCount: paxInfants,
          seatPassengers: paxAdults + paxChildren,
        },
        status: "pending_payment",
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setBookingResult({
        id: booking.id,
        number: booking.booking_number,
        passengerData,
      });
      toast.success(`Booking submitted for ${flight.airline}!`);
    } catch (error) {
      toast.error("Failed to submit booking");
    }
  };

  const handleClose = () => {
    setBookingResult(null);
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Flight not found</p>
        <Button variant="outline" onClick={() => navigate("/flights")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Flights
        </Button>
      </div>
    );
  }

  const flightDate = new Date(flight.departure_date);
  const maxPassengers = flight.available_seats || 10;

  if (bookingResult) {
    return (
      <div className="max-w-5xl mx-auto">
        <UniversalVoucher
          details={{
            type: "flight",
            bookingId: bookingResult.id,
            bookingNumber: bookingResult.number,
            serviceName: multiCityFlights.length > 0 
              ? `Multi-City Flight (${flight.departure_city} → ${multiCityFlights[multiCityFlights.length - 1].arrival_city})`
              : `${flight.airline} ${flight.departure_flight_number || flight.flight_number || ""}`,
            totalAmount: totalPrice,
            passengerCount: passengerCount,
            passengerNames: bookingResult.passengerData.passengers.map(
              (p) => `${p.firstName} ${p.lastName}`
            ),
            contactEmail: bookingResult.passengerData.contactEmail,
            contactPhone: bookingResult.passengerData.contactPhone,
            departureCity: flight.departure_city,
            arrivalCity: flight.arrival_city,
            departureDate: flightDate,
            departureTime: flight.departure_time || undefined,
            arrivalTime: flight.arrival_time || undefined,
            airline: flight.airline,
            airlineLogo: flight.airline_logo,
            flightNumber: flight.departure_flight_number || flight.flight_number || undefined,
            flightClass: flight.class || undefined,
            status: "pending",
          }}
          onClose={handleClose}
        />
      </div>
    );
  }

  const FlightLegCard = ({ leg, label, icon, fareRate }: { leg: typeof flight; label: string; icon: React.ReactNode; fareRate: number }) => {
    if (!leg) return null;
    const legDate = new Date(leg.departure_date);
    const depTime = (leg.departure_time || "").substring(0, 5);
    const arrTime = (leg.arrival_time || "").substring(0, 5);
    const depCode = leg.departure_airport_code || leg.departure_city?.substring(0, 3).toUpperCase();
    const arrCode = leg.arrival_airport_code || leg.arrival_city?.substring(0, 3).toUpperCase();

    // Calculate duration
    let duration = "";
    if (leg.departure_time && leg.arrival_time) {
      const [dh, dm] = leg.departure_time.split(":").map(Number);
      const [ah, am] = leg.arrival_time.split(":").map(Number);
      const totalMins = (ah * 60 + am) - (dh * 60 + dm);
      if (totalMins > 0) {
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
      }
    }

    return (
      <div className="space-y-3">
        {/* Header: label + class badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-foreground">{label}</span>
          </div>
          {leg.class && (
            <Badge variant="secondary" className="text-[10px] uppercase font-semibold tracking-wider">
              {leg.class}
            </Badge>
          )}
        </div>

        {/* Airline row */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl border border-border/80 bg-background shadow-sm flex items-center justify-center shrink-0 p-1">
            {leg.airline_logo ? (
              <img src={leg.airline_logo} alt={leg.airline} className="h-full w-full object-contain" />
            ) : (
              <Plane className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-bold text-sm text-foreground leading-tight">{leg.airline}</p>
            {(leg.departure_flight_number || leg.return_flight_number || leg.flight_number) && (
              <p className="text-[10px] text-muted-foreground font-mono">
                {leg.departure_flight_number || leg.return_flight_number || leg.flight_number}
              </p>
            )}
          </div>
        </div>

        {/* Flight timeline: DEP ──── duration ──── ARR */}
        <div className="bg-primary/5 rounded-xl px-4 py-3 border border-primary/10">
          <div className="flex items-center justify-between gap-2">
            {/* Departure */}
            <div className="text-left">
              <p className="text-2xl font-black text-[#2A3F8B] leading-none tabular-nums">{depTime || "TBA"}</p>
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{depCode}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate max-w-[80px]">{leg.departure_city}</p>
            </div>

            {/* Line + duration */}
            <div className="flex-1 flex flex-col items-center gap-1 px-2">
              <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                {duration || "DIRECT"}
              </span>
              <div className="w-full flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                <div className="flex-1 border-t border-dashed border-primary/30" />
                <Plane className="h-3 w-3 text-primary shrink-0" />
                <div className="flex-1 border-t border-dashed border-primary/30" />
                <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              </div>
              <span className="text-[9px] text-muted-foreground font-medium">Direct</span>
            </div>

            {/* Arrival */}
            <div className="text-right">
              <p className="text-2xl font-black text-[#2A3F8B] leading-none tabular-nums">{arrTime || "TBA"}</p>
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{arrCode}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate max-w-[80px] text-right">{leg.arrival_city}</p>
            </div>
          </div>

          {/* Date row */}
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-primary/10">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3 text-primary" />
              <span className="font-semibold text-foreground">{format(legDate, "EEE, d MMM yyyy")}</span>
            </div>
          </div>
        </div>

        {/* Price row */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">{fareRate === 0 && label === "Return" ? "Return Flight" : "Price per person"}</span>
          <span className="font-bold text-sm text-foreground tabular-nums">{fareRate === 0 && label === "Return" ? "Included" : `${formatCurrency(fareRate, flight.currency)}`}</span>
        </div>
      </div>
    );
  };


  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={handleClose} className="h-9 w-9 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Book Flight</h2>
          <p className="text-sm text-muted-foreground">
            {flight.airline} • {flight.departure_flight_number || flight.flight_number || "Flight"}
            {isRoundTrip && " (Round-trip)"}
          </p>
        </div>
        {isRoundTrip && (
          <Badge className="bg-primary/10 text-primary border-none font-bold gap-1">
            <ArrowLeftRight className="h-3 w-3" /> Round-trip
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Passenger Form */}
        <div className="lg:col-span-2">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Passenger Details ({passengerCount}{" "}
            {passengerCount === 1 ? "traveler" : "travelers"})
          </h3>
          <PassengerDetailsForm
            passengerCount={passengerCount}
            onPassengerCountChange={() => {}}
            onSubmit={handlePassengerSubmit}
            isLoading={createBooking.isPending}
            maxPassengers={maxPassengers}
            showPassengerCounter={false}
            departureDate={flight.departure_date}
            passengerCategories={passengerCategories}
            requiredDocuments={requiredDocuments}
          />
        </div>

        {/* Right: Flight Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-5">
            <Card className="rounded-2xl border border-border/80 bg-card shadow-xl shadow-primary/5 overflow-hidden">
              <div className="p-6 space-y-6">
                {multiCityFlights.length > 0 ? (
                  <>
                    <FlightLegCard
                      leg={flight}
                      label="Leg 1"
                      icon={<Plane className="h-3.5 w-3.5" />}
                      fareRate={getEffectiveFare(flight.price, outAvailSeats, flight.departure_date, outDefaultFares, outSpecialFares).rate}
                    />
                    {multiCityFlights.map((leg, idx) => {
                      const legAvail = leg.available_seats ?? leg.total_seats ?? 100;
                      const legDefs = bulkDefaultFares[leg.id] || [];
                      const legSpecs = bulkSpecialFares[leg.id] || [];
                      const legFare = getEffectiveFare(leg.price, legAvail, leg.departure_date, legDefs, legSpecs);
                      return (
                        <div key={leg.id} className="border-t border-border/80 pt-6">
                          <FlightLegCard
                            leg={leg}
                            label={`Leg ${idx + 2}`}
                            icon={<Plane className="h-3.5 w-3.5" />}
                            fareRate={legFare.rate}
                          />
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <>
                    {/* Outbound Flight */}
                    <FlightLegCard
                      leg={flight}
                      label={isRoundTrip ? "Outbound" : "Flight"}
                      icon={<Plane className="h-3.5 w-3.5" />}
                      fareRate={outboundFare.rate}
                    />

                    {/* Return Flight */}
                    {returnFlight && (
                      <div className="border-t border-border/80 pt-6">
                        <FlightLegCard
                          leg={returnFlight}
                          label="Return"
                          icon={<Plane className="h-3.5 w-3.5 rotate-180" />}
                          fareRate={isExplicitRoundTrip ? 0 : returnFare.rate}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Rate Breakdown */}
                <div className="space-y-3 pt-6 border-t border-border/80">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">Rate Breakdown</span>
                  </div>

                  {fareLines.map((fl, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1">
                      <span className="text-muted-foreground font-medium">
                        {fl.count}x {fl.personType}
                        {fl.personType === "Infant" && (
                          <span className="text-[10px] block text-muted-foreground/70">No seat — lap only</span>
                        )}
                      </span>
                      <div className="text-right flex items-center gap-2">
                        <span className="font-bold tabular-nums text-foreground">{formatCurrency(fl.rate, flight.currency)}</span>
                        {fl.commission > 0 && (
                          <Badge variant="secondary" className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-0 text-[10px] font-bold tabular-nums px-2 py-0.5">
                            +{formatCurrency(fl.commission, flight.currency)} com
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}

                  {multiCityFlights.length > 0 && (
                    <div className="text-xs text-muted-foreground pt-3 mt-2 border-t border-border/60 space-y-2 font-medium">
                      <div className="flex items-center justify-between">
                        <span>Leg 1 rate</span>
                        <span className="tabular-nums font-semibold text-foreground">{formatCurrency(getEffectiveFare(flight.price, outAvailSeats, flight.departure_date, outDefaultFares, outSpecialFares).rate, flight.currency)}</span>
                      </div>
                      {multiCityFlights.map((leg, idx) => {
                        const legAvail = leg.available_seats ?? leg.total_seats ?? 100;
                        const legDefs = bulkDefaultFares[leg.id] || [];
                        const legSpecs = bulkSpecialFares[leg.id] || [];
                        const legFare = getEffectiveFare(leg.price, legAvail, leg.departure_date, legDefs, legSpecs);
                        return (
                          <div key={leg.id} className="flex items-center justify-between">
                            <span>Leg {idx + 2} rate</span>
                            <span className="tabular-nums font-semibold text-foreground">{formatCurrency(legFare.rate, flight.currency)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isRoundTrip && (
                    <div className="text-xs text-muted-foreground pt-3 mt-2 border-t border-border/60 space-y-2 font-medium">
                      <div className="flex items-center justify-between">
                        <span>{isExplicitRoundTrip ? "Round trip rate" : "Outbound rate"}</span>
                        <span className="tabular-nums font-semibold text-foreground">{formatCurrency(outboundFare.rate, flight.currency)}</span>
                      </div>
                      {!isExplicitRoundTrip && (
                        <div className="flex items-center justify-between">
                          <span>Return rate</span>
                          <span className="tabular-nums font-semibold text-foreground">{formatCurrency(returnFare.rate, returnFlight?.currency)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-3 pt-6 border-t border-border/80">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold tabular-nums text-foreground">{formatCurrency(fareLines.reduce((sum, fl) => sum + fl.rate * fl.count, 0), flight.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Total Commission</span>
                    <span className="font-bold tabular-nums text-[hsl(var(--success))]">{formatCurrency(fareLines.reduce((sum, fl) => sum + fl.commission * fl.count, 0), flight.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-border/60">
                    <span className="font-bold text-foreground">Net Amount</span>
                    <span className="font-extrabold tabular-nums text-primary">{formatCurrency(fareLines.reduce((sum, fl) => sum + (fl.rate - fl.commission) * fl.count, 0), flight.currency)}</span>
                  </div>
                </div>

                {/* Grand Total Footer */}
                <div className="mt-6 -mx-6 -mb-6 p-6 bg-gradient-to-r from-primary to-primary/95 text-primary-foreground flex items-center justify-between shadow-lg shadow-primary/20">
                  <span className="font-bold text-sm tracking-wide">Total Amount</span>
                  <span className="text-3xl font-extrabold tabular-nums tracking-tight">{formatCurrency(totalPrice, flight.currency)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookFlight;
