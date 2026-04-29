import { useState, useCallback } from "react";
import { Loader2, Plane, MapPin, Calendar, Clock, Users, ArrowLeft, ShieldAlert, Lock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingPaymentStep } from "./BookingPaymentStep";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCreateBooking } from "@/hooks/useBookings";
import { UniversalVoucher } from "./UniversalVoucher";
import { PassengerDetailsForm, PassengerFormData } from "./PassengerDetailsForm";
import type { Flight } from "@/hooks/useFlights";
import { format } from "date-fns";
import { BookingCelebration } from "./BookingCelebration";
import { Badge } from "@/components/ui/badge";
import { useAgencySeatBlockValidation } from "@/hooks/useAgencySeatBlockValidation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFlightPriceTiers, getTieredPrice } from "@/hooks/useFlightPriceTiers";

interface FlightBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flight: Flight | null;
  initialPassengerCount?: number;
}

export function FlightBookingModal({ open, onOpenChange, flight, initialPassengerCount = 1 }: FlightBookingModalProps) {
  const [passengerCount] = useState(initialPassengerCount);
  const [showCelebration, setShowCelebration] = useState(false);
  const [step, setStep] = useState<"passengers" | "payment" | "voucher">("passengers");
  const [bookingResult, setBookingResult] = useState<{
    id: string;
    number: string;
    passengerData: PassengerFormData;
  } | null>(null);
  const createBooking = useCreateBooking();
  const seatBlock = useAgencySeatBlockValidation(flight?.id || null);
  const { data: priceTiers } = useFlightPriceTiers(flight?.id || null);
  
  const effectivePrice = flight ? getTieredPrice(flight.price, passengerCount, priceTiers || []) : 0;
  const exceedsBlockAllocation = seatBlock.hasBlock && passengerCount > seatBlock.remainingSeats;

  const handlePassengerSubmit = async (passengerData: PassengerFormData) => {
    if (!flight) return;
    if (exceedsBlockAllocation) {
      toast.error(`Cannot book ${passengerCount} seats. Only ${seatBlock.remainingSeats} of your ${seatBlock.blockedSeats} blocked seats remain.`);
      return;
    }
    try {
      const booking = await createBooking.mutateAsync({
        booking_type: "flight",
        flight_id: flight.id,
        total_amount: effectivePrice * passengerCount,
        passengers: passengerCount, // Modal doesn't have infant breakdown, all count as seats
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
        status: "pending_payment",
      });

      setBookingResult({
        id: booking.id,
        number: booking.booking_number,
        passengerData,
      });
      setStep("payment");
      toast.success(`Booking created! Please complete payment.`);
    } catch (error) {
      toast.error("Failed to submit booking");
    }
  };

  const handleClose = () => {
    setBookingResult(null);
    setShowCelebration(false);
    setStep("passengers");
    onOpenChange(false);
  };

  const handlePaymentComplete = () => {
    setShowCelebration(true);
    setStep("voucher");
  };

  if (!flight) return null;

  const totalPrice = passengerCount * effectivePrice;
  const hasTieredDiscount = priceTiers && priceTiers.length > 0 && effectivePrice !== flight.price;
  const flightDate = new Date(flight.departure_date);
  const maxPassengers = flight.available_seats || 10;

  // Show voucher after successful booking
  if (bookingResult && step === "voucher") {
    return (
      <>
      <BookingCelebration
        show={showCelebration}
        bookingNumber={bookingResult.number}
        title={`${flight.airline} ${flight.flight_number || ''}`}
        totalAmount={totalPrice}
        type="flight"
        summaryItems={[
          { label: "Route", value: `${flight.departure_city} → ${flight.arrival_city}` },
          { label: "Date", value: format(flightDate, "dd/MM/yyyy") },
          { label: "Passengers", value: `${passengerCount} traveler${passengerCount > 1 ? "s" : ""}` },
          { label: "Class", value: flight.class || "Economy" },
        ]}
        onClose={() => { setShowCelebration(false); handleClose(); }}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="!max-w-none !w-auto !left-[var(--sidebar-width,16rem)] !right-0 !top-0 !translate-x-0 !translate-y-0 h-screen sm:rounded-none overflow-y-auto">
          <UniversalVoucher
            details={{
              type: "flight",
              bookingId: bookingResult.id,
              bookingNumber: bookingResult.number,
              serviceName: `${flight.airline} ${flight.flight_number || ''}`,
              totalAmount: totalPrice,
              passengerCount: passengerCount,
              passengerNames: bookingResult.passengerData.passengers.map(
                p => `${p.firstName} ${p.lastName}`
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
        </DialogContent>
      </Dialog>
      </>
    );
  }

  // Payment step
  if (bookingResult && step === "payment") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="!max-w-none !w-auto !left-[var(--sidebar-width,16rem)] !right-0 !top-0 !translate-x-0 !translate-y-0 h-screen sm:rounded-none p-6 overflow-y-auto">
          <BookingPaymentStep
            bookingId={bookingResult.id}
            totalAmount={totalPrice}
            bookingNumber={bookingResult.number}
            onPaymentComplete={handlePaymentComplete}
            onBack={() => {}}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-none !w-auto !left-[var(--sidebar-width,16rem)] !right-0 !top-0 !translate-x-0 !translate-y-0 h-screen sm:rounded-none overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-9 w-9 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold">Book Flight</h2>
              <p className="text-sm text-muted-foreground">{flight.airline} • {flight.flight_number || 'Flight'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{passengerCount} traveler{passengerCount > 1 ? "s" : ""}</p>
            <p className="text-2xl font-bold text-primary">${totalPrice}</p>
            {hasTieredDiscount && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                <Layers className="h-3 w-3" />
                Tiered: ${effectivePrice}/seat
              </p>
            )}
            {passengerCount > 1 && !hasTieredDiscount && (
              <p className="text-xs text-muted-foreground">${flight.price} × {passengerCount}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Left: Passenger Form */}
          <div className="lg:col-span-2">
            {/* Seat Block Validation Alert */}
            {seatBlock.hasBlock && (
              <Alert variant={exceedsBlockAllocation ? "destructive" : "default"} className="mb-4">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  {exceedsBlockAllocation ? (
                    <>
                      <strong>Seat block limit exceeded.</strong> You have {seatBlock.remainingSeats} of {seatBlock.blockedSeats} blocked seats remaining ({seatBlock.usedSeats} already booked). 
                      Reduce passenger count to {seatBlock.remainingSeats} or fewer.
                    </>
                  ) : (
                    <>
                      <strong>Blocked seats:</strong> {seatBlock.remainingSeats} of {seatBlock.blockedSeats} remaining ({seatBlock.usedSeats} used)
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Passenger Details ({passengerCount} {passengerCount === 1 ? 'traveler' : 'travelers'})
            </h3>
            <PassengerDetailsForm
              passengerCount={passengerCount}
              onPassengerCountChange={() => {}}
              onSubmit={handlePassengerSubmit}
              isLoading={createBooking.isPending || exceedsBlockAllocation}
              maxPassengers={seatBlock.hasBlock ? Math.min(maxPassengers, seatBlock.remainingSeats) : maxPassengers}
              showPassengerCounter={false}
            />
          </div>

          {/* Right: Flight Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="bg-gradient-to-b from-primary/10 to-primary/5 rounded-2xl p-5 space-y-4 border border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center">
                    {flight.airline_logo ? (
                      <img src={flight.airline_logo} alt={flight.airline} className="h-10 w-10 object-contain" />
                    ) : (
                      <Plane className="h-7 w-7 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{flight.airline}</h3>
                    <p className="text-sm text-muted-foreground">{flight.flight_number || 'Flight'}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-primary/20">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium">{flight.departure_city} → {flight.arrival_city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                    <span>{format(flightDate, 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <span>{(flight.departure_time || 'TBA').substring(0, 5)} - {(flight.arrival_time || 'TBA').substring(0, 5)}</span>
                  </div>
                  {flight.class && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{flight.class}</Badge>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-3 border-t border-primary/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base price per person</span>
                    <span className={`font-medium ${hasTieredDiscount ? "line-through text-muted-foreground" : ""}`}>${flight.price}</span>
                  </div>
                  {hasTieredDiscount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        Tiered price ({passengerCount} pax)
                      </span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">${effectivePrice}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Travelers</span>
                    <span className="font-medium">{passengerCount}</span>
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
      </DialogContent>
    </Dialog>
  );
}
