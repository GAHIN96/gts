import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Plane, MapPin, Calendar, Clock, Users, ArrowLeft, ArrowRight, ArrowLeftRight, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCreateBooking } from "@/hooks/useBookings";
import { UniversalVoucher } from "@/components/booking/UniversalVoucher";
import { PassengerDetailsForm, PassengerFormData } from "@/components/booking/PassengerDetailsForm";
import { useFlights } from "@/hooks/useFlights";
import { useFlightDefaultFares, useFlightSpecialFares, FlightDefaultFare, FlightSpecialFare } from "@/hooks/useFlightFares";
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

/** Find the best matching fare: special (date-matched) first, then default, then base price */
function getEffectiveFare(
  basePricePerSeat: number,
  passengerCount: number,
  departureDate: string,
  defaultFares: FlightDefaultFare[],
  specialFares: FlightSpecialFare[],
  personType?: string
): { rate: number; commission: number; source: string; personType: string } {
  const depDate = new Date(departureDate);
  
  // If a specific person type is requested, match it
  if (personType) {
    const matchingSpecial = specialFares.find(
      (f) =>
        f.person_type.toLowerCase() === personType.toLowerCase() &&
        passengerCount >= f.seat_from &&
        passengerCount <= f.seat_to &&
        depDate >= new Date(f.from_date) &&
        depDate <= new Date(f.to_date)
    );
    if (matchingSpecial) {
      return { rate: matchingSpecial.rate, commission: matchingSpecial.commission, source: "special", personType: matchingSpecial.person_type };
    }
    const matchingDefault = defaultFares.find(
      (f) =>
        f.person_type.toLowerCase() === personType.toLowerCase() &&
        passengerCount >= f.seat_from &&
        passengerCount <= f.seat_to
    );
    if (matchingDefault) {
      return { rate: matchingDefault.rate, commission: matchingDefault.commission, source: "default", personType: matchingDefault.person_type };
    }
  }

  // No specific type - find any matching fare by seat range
  const anySpecial = specialFares.find(
    (f) =>
      passengerCount >= f.seat_from &&
      passengerCount <= f.seat_to &&
      depDate >= new Date(f.from_date) &&
      depDate <= new Date(f.to_date)
  );
  if (anySpecial) {
    return { rate: anySpecial.rate, commission: anySpecial.commission, source: "special", personType: anySpecial.person_type };
  }

  const anyDefault = defaultFares.find(
    (f) => passengerCount >= f.seat_from && passengerCount <= f.seat_to
  );
  if (anyDefault) {
    return { rate: anyDefault.rate, commission: anyDefault.commission, source: "default", personType: anyDefault.person_type };
  }

  return { rate: basePricePerSeat, commission: 0, source: "base", personType: "Adult" };
}

const BookFlight = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const passengerCount = parseInt(searchParams.get("passengers") || "1", 10);
  const returnFlightId = searchParams.get("returnFlightId");
  const paxAdults = parseInt(searchParams.get("adults") || String(passengerCount), 10);
  const paxChildren = parseInt(searchParams.get("children") || "0", 10);
  const paxInfants = parseInt(searchParams.get("infants") || "0", 10);

  const { data: flights, isLoading } = useFlights();
  const flight = flights?.find((f) => f.id === id) ?? null;
  const returnFlight = returnFlightId ? flights?.find((f) => f.id === returnFlightId) ?? null : null;

  // Fetch fares for outbound
  const { data: outDefaultFares = [] } = useFlightDefaultFares(flight?.id || null);
  const { data: outSpecialFares = [] } = useFlightSpecialFares(flight?.id || null);
  // Fetch fares for return
  const { data: retDefaultFares = [] } = useFlightDefaultFares(returnFlight?.id || null);
  const { data: retSpecialFares = [] } = useFlightSpecialFares(returnFlight?.id || null);

  const [bookingResult, setBookingResult] = useState<{
    id: string;
    number: string;
    passengerData: PassengerFormData;
  } | null>(null);
  const createBooking = useCreateBooking();

  const isRoundTrip = !!returnFlight;
  const seatPassengerCount = paxAdults + paxChildren || passengerCount; // exclude infants for seat-range matching

  // Calculate effective fares using fare hierarchy
  // Build fare lines from all defined fare types
  const buildFareLines = () => {
    if (!flight) return [];
    
    const lines: { personType: string; rate: number; commission: number; count: number }[] = [];
    
    const addLine = (type: string, count: number) => {
      if (count <= 0) return;
      const outFare = getEffectiveFare(flight.price, seatPassengerCount, flight.departure_date, outDefaultFares, outSpecialFares, type);
      const retFare = returnFlight
        ? getEffectiveFare(returnFlight.price, seatPassengerCount, returnFlight.departure_date, retDefaultFares, retSpecialFares, type)
        : { rate: 0, commission: 0, source: "base", personType: type };
      lines.push({ personType: type, rate: outFare.rate + retFare.rate, commission: outFare.commission + retFare.commission, count });
    };
    
    if (paxAdults > 0 || paxChildren > 0 || paxInfants > 0) {
      // We have a breakdown from search
      addLine("Adult", paxAdults);
      addLine("Child", paxChildren);
      addLine("Infant", paxInfants);
    } else {
      // Fallback: all as adult
      const outFare = getEffectiveFare(flight.price, seatPassengerCount, flight.departure_date, outDefaultFares, outSpecialFares);
      const retFare = returnFlight
        ? getEffectiveFare(returnFlight.price, seatPassengerCount, returnFlight.departure_date, retDefaultFares, retSpecialFares)
        : { rate: 0, commission: 0, source: "base", personType: "Adult" };
      lines.push({ personType: outFare.personType, rate: outFare.rate + retFare.rate, commission: outFare.commission + retFare.commission, count: passengerCount });
    }
    
    return lines.filter(l => l.count > 0);
  };

  // Build passenger categories array for form labeling
  const passengerCategories: string[] = [];
  for (let i = 0; i < paxAdults; i++) passengerCategories.push("Adult");
  for (let i = 0; i < paxChildren; i++) passengerCategories.push("Child");
  for (let i = 0; i < paxInfants; i++) passengerCategories.push("Infant");

  const fareLines = buildFareLines();
  
  // Use first fare line for main pricing (backward compat)
  const outboundFare = flight
    ? getEffectiveFare(flight.price, passengerCount, flight.departure_date, outDefaultFares, outSpecialFares)
    : { rate: 0, commission: 0, source: "base", personType: "Adult" };
  const returnFare = returnFlight
    ? getEffectiveFare(returnFlight.price, passengerCount, returnFlight.departure_date, retDefaultFares, retSpecialFares)
    : { rate: 0, commission: 0, source: "base", personType: "Adult" };

  const ratePerPerson = outboundFare.rate + returnFare.rate;
  const commissionPerPerson = outboundFare.commission + returnFare.commission;
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
        metadata.returnFlightNumber = returnFlight.flight_number;
        metadata.returnDepartureCity = returnFlight.departure_city;
        metadata.returnArrivalCity = returnFlight.arrival_city;
        metadata.returnDepartureDate = returnFlight.departure_date;
        metadata.returnDepartureTime = returnFlight.departure_time;
        metadata.returnArrivalTime = returnFlight.arrival_time;
        metadata.returnPrice = returnFlight.price;
        metadata.isRoundTrip = true;
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
            serviceName: `${flight.airline} ${flight.flight_number || ""}`,
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
            flightNumber: flight.flight_number || undefined,
            flightClass: flight.class || undefined,
            status: "pending",
          }}
          onClose={handleClose}
        />
      </div>
    );
  }

  // Reusable flight card for sidebar
  const FlightLegCard = ({ leg, label, icon, fareRate }: { leg: typeof flight; label: string; icon: React.ReactNode; fareRate: number }) => {
    if (!leg) return null;
    const legDate = new Date(leg.departure_date);
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {leg.airline_logo ? (
              <img src={leg.airline_logo} alt={leg.airline} className="h-7 w-7 object-contain" />
            ) : (
              <Plane className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{leg.airline}</p>
            <p className="text-xs text-muted-foreground">{leg.flight_number || "Flight"}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium text-sm">
              {leg.departure_city} → {leg.arrival_city}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-sm">{format(legDate, "dd/MM/yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-sm">
              {(leg.departure_time || "TBA").substring(0, 5)} - {(leg.arrival_time || "TBA").substring(0, 5)}
            </span>
          </div>
          {leg.class && (
            <Badge variant="outline" className="text-xs">{leg.class}</Badge>
          )}
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Price per person</span>
          <span className="font-semibold">${fareRate}</span>
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
            {flight.airline} • {flight.flight_number || "Flight"}
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
            hidePassengerInfo={true}
            hideSpecialRequests={true}
            departureDate={flight.departure_date}
            passengerCategories={passengerCategories}
          />
        </div>

        {/* Right: Flight Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="bg-gradient-to-b from-primary/10 to-primary/5 rounded-2xl p-5 space-y-4 border border-primary/20">
              
              {/* Outbound Flight */}
              <FlightLegCard
                leg={flight}
                label={isRoundTrip ? "Outbound" : "Flight"}
                icon={<Plane className="h-4 w-4 text-primary" />}
                fareRate={outboundFare.rate}
              />

              {/* Return Flight */}
              {returnFlight && (
                <>
                  <div className="border-t border-dashed border-primary/20 pt-4">
                    <FlightLegCard
                      leg={returnFlight}
                      label="Return"
                      icon={<Plane className="h-4 w-4 text-primary rotate-180" />}
                      fareRate={returnFare.rate}
                    />
                  </div>
                </>
              )}

              {/* Rate Breakdown */}
              <div className="space-y-2 pt-3 border-t border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rate Breakdown</span>
                </div>

                {fareLines.map((fl, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {fl.count}x {fl.personType}
                      {fl.personType === "Infant" && (
                        <span className="text-[10px] block text-muted-foreground/70">No seat — lap only</span>
                      )}
                    </span>
                    <div className="text-right">
                      <span className="font-medium">${fl.rate}</span>
                      {fl.commission > 0 && (
                        <span className="text-xs text-green-600 ml-1">
                          (${fl.commission} Commission)
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {isRoundTrip && (
                  <div className="text-xs text-muted-foreground pt-1 border-t border-primary/10 space-y-1">
                    <div className="flex justify-between">
                      <span>Outbound rate</span>
                      <span>${outboundFare.rate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Return rate</span>
                      <span>${returnFare.rate}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-3 border-t border-primary/20">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>${fareLines.reduce((sum, fl) => sum + fl.rate * fl.count, 0)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Total Commission</span>
                  <span>${fareLines.reduce((sum, fl) => sum + fl.commission * fl.count, 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-primary">
                  <span>Net Amount</span>
                  <span>${fareLines.reduce((sum, fl) => sum + (fl.rate - fl.commission) * fl.count, 0)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-primary/20 bg-primary/10 -mx-5 -mb-5 px-5 py-4 rounded-b-2xl">
                <span className="font-semibold">Total Amount</span>
                <span className="text-2xl font-bold text-primary">${totalPrice}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookFlight;
