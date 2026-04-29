import { useState, useEffect, useRef } from "react";
import { Hotel, MapPin, Star, CalendarIcon, Users, Bed, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreateBooking } from "@/hooks/useBookings";
import { UniversalVoucher } from "./UniversalVoucher";
import { BookingPaymentStep } from "./BookingPaymentStep";
import { PassengerDetailsForm, PassengerFormData } from "./PassengerDetailsForm";
import { HotelRoomConfigurator, RoomConfig, evaluateRoom } from "./HotelRoomConfigurator";
import type { Hotel as HotelType } from "@/hooks/useHotels";
import { format, differenceInDays, addDays } from "date-fns";
import { BookingCelebration } from "./BookingCelebration";
import { pickRoomBand } from "@/lib/roomPricingTier";
import { useHotelAvailableDates } from "@/hooks/useHotelAvailableDates";
import { useHotelBookings } from "@/hooks/useHotelBookings";
import { getStayWindowRemaining } from "@/lib/hotelAvailability";

interface HotelBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotel: HotelType | null;
  initialCheckIn?: Date;
  initialCheckOut?: Date;
  initialGuests?: number;
  initialRooms?: number;
  initialRoomConfigs?: RoomConfig[];
}

export function HotelBookingModal({ 
  open, 
  onOpenChange, 
  hotel,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 2,
  initialRooms = 1,
  initialRoomConfigs,
}: HotelBookingModalProps) {
  const [checkIn, setCheckIn] = useState<Date | undefined>(initialCheckIn);
  const [checkOut, setCheckOut] = useState<Date | undefined>(initialCheckOut);
  const [rooms, setRooms] = useState<RoomConfig[]>(initialRoomConfigs && initialRoomConfigs.length > 0 ? initialRoomConfigs : [{ adults: initialGuests, children6to12: 0, children2to6: 0, infants: 0 }]);
  const [guestsApplied, setGuestsApplied] = useState(false);
  const [step, setStep] = useState<"form" | "payment" | "voucher">("form");
  const [showCelebration, setShowCelebration] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    id: string;
    number: string;
    passengerData: PassengerFormData;
  } | null>(null);
  const createBooking = useCreateBooking();
  const wasOpenRef = useRef(false);

  // Track if opened from search (has pre-filled params)
  const hasSearchParams = !!(initialCheckIn && initialCheckOut);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;

    if (justOpened) {
      setCheckIn(initialCheckIn || addDays(new Date(), 1));
      setCheckOut(initialCheckOut || addDays(new Date(), 3));
      const initRooms: RoomConfig[] = initialRoomConfigs && initialRoomConfigs.length > 0
        ? initialRoomConfigs
        : Array.from({ length: initialRooms }, () => ({
            adults: Math.max(1, Math.ceil(initialGuests / initialRooms)),
            children6to12: 0,
            children2to6: 0,
            infants: 0,
          }));
      setRooms(initRooms);
      setGuestsApplied(hasSearchParams);
      setBookingResult(null);
      setStep("form");
    }

    wasOpenRef.current = open;
  }, [open, initialCheckIn, initialCheckOut, initialGuests, initialRooms, initialRoomConfigs, hasSearchParams]);

  const nights = checkIn && checkOut ? Math.max(1, differenceInDays(checkOut, checkIn)) : 0;

  // Derive room type per-room using the SAME logic as the configurator badges
  const deriveRoomType = (r: RoomConfig): string => {
    const ev = evaluateRoom(r);
    switch (ev.type) {
      case "single": return "Single";
      case "double": return "Double";
      case "double_extra_bed": return "Double + Extra Bed";
      case "triple": return "Triple";
      default: return "Double";
    }
  };

  const activeRooms = (hotel?.hotel_rooms || []).filter((r: any) => r.is_active !== false);
  const roomCount = rooms.length;
  const cheapestRoom = activeRooms.length > 0
    ? activeRooms.reduce((min: any, r: any) =>
        ((r.price_per_night ?? r.price_adult ?? 0) < (min.price_per_night ?? min.price_adult ?? 0)) ? r : min
      , activeRooms[0])
    : null;

  // Live availability for the chosen window — used to pick the default-rate
  // band (matches the search card so card price = booking summary price).
  const { data: hotelAvailableDates = [] } = useHotelAvailableDates();
  const { data: hotelBookings = [] } = useHotelBookings();
  // Shared helper — same inputs as the search card so the per-night band
  // (e.g. 10–6 vs 6–1 in admin Default Prices) always matches what the user
  // saw on the card. `null` and `0` both mean "sold out for these dates".
  const availableInPeriod = hotel && checkIn && checkOut
    ? getStayWindowRemaining(
        hotel.id,
        checkIn,
        checkOut,
        hotelAvailableDates as any,
        hotelBookings as any,
      )
    : null;
  const isSoldOut = !!checkIn && !!checkOut && (availableInPeriod === 0 || availableInPeriod === null);

  // Pricing band selection: AVAILABILITY-DRIVEN (matches admin default-rate
  // tiers and the search card). The band is chosen by the rooms remaining in
  // the inventory window covering the stay; falls back to the requested room
  // count when no dates / no window is available.
  const totalByType: Record<string, number> = {};
  rooms.forEach((r) => {
    const t = deriveRoomType(r);
    totalByType[t] = (totalByType[t] || 0) + 1;
  });

  const perRoomPricing = rooms.map((r) => {
    const type = deriveRoomType(r);
    const selector = totalByType[type] || 1;
    const band = pickRoomBand(activeRooms as any, type, selector, availableInPeriod);
    const picked = band || cheapestRoom;
    const price = (picked?.price_per_night ?? picked?.price_adult ?? hotel?.price_per_night ?? 0) as number;
    return { type, displayType: picked?.room_type || type, price };
  });

  const displayRoomTypeName = perRoomPricing[0]?.displayType || "Double";
  const pricePerNight = perRoomPricing[0]?.price ?? 0;

  const totalPrice = perRoomPricing.reduce((sum, p) => sum + p.price * nights, 0);
  const totalChildren = (r: RoomConfig) => r.children6to12 + r.children2to6;
  const totalGuests = rooms.reduce((sum, r) => sum + r.adults + totalChildren(r) + r.infants, 0);
  const pricePerGuest = totalGuests > 0 ? totalPrice / totalGuests : 0;

  const roomAssignments = rooms.map((room, idx) => {
    const ch = totalChildren(room);
    return {
      roomNumber: idx + 1,
      roomType: `${room.adults} Adult${room.adults > 1 ? 's' : ''}${ch > 0 ? `, ${ch} Child${ch > 1 ? 'ren' : ''}` : ''}${room.infants > 0 ? `, ${room.infants} Infant${room.infants > 1 ? 's' : ''}` : ''}`,
      // Pass the resolved tier-band display name (e.g. "Single", "Double + Extra Bed")
      // so the passenger-form room header matches the booking summary chips.
      bedType: perRoomPricing[idx]?.displayType,
      guestCount: room.adults + ch + room.infants,
      adults: room.adults,
      children6to12: room.children6to12,
      children2to6: room.children2to6,
      infants: room.infants,
    };
  });

  const handleApplyGuests = () => {
    if (isSoldOut) {
      toast.error("Sold out for these dates. Please choose different dates.");
      return;
    }
    setGuestsApplied(true);
  };

  const handleGuestSubmit = async (passengerData: PassengerFormData) => {
    if (!hotel || !checkIn || !checkOut) return;
    if (isSoldOut) {
      toast.error("Sold out for these dates. Please choose different dates.");
      return;
    }
    try {
      const booking = await createBooking.mutateAsync({
        booking_type: "hotel",
        hotel_id: hotel.id,
        total_amount: totalPrice,
        passengers: totalGuests,
        passenger_details: passengerData.passengers.map((p, index) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          passportNumber: p.passportNumber,
          passportExpiry: p.passportExpiry,
          documents: p.documents || [],
          isLead: index === 0,
        })),
        special_requests: passengerData.specialRequests,
        notes: JSON.stringify({
          check_in: checkIn.toISOString(),
          check_out: checkOut.toISOString(),
          rooms: roomCount,
          roomConfig: rooms,
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
    setRooms([{ adults: 2, children6to12: 0, children2to6: 0, infants: 0 }]);
    setGuestsApplied(false);
    setShowCelebration(false);
    setBookingResult(null);
    setStep("form");
    onOpenChange(false);
  };

  const handlePaymentComplete = () => {
    setShowCelebration(true);
    setStep("voucher");
  };

  if (!hotel) return null;

  // Voucher view
  if (bookingResult && checkIn && checkOut && step === "voucher") {
    return (
      <>
      <BookingCelebration
        show={showCelebration}
        bookingNumber={bookingResult.number}
        title={hotel.name}
        totalAmount={totalPrice}
        type="hotel"
        summaryItems={[
          { label: "Hotel", value: hotel.name },
          { label: "Location", value: `${hotel.cities?.name}, ${hotel.cities?.country}` },
          { label: "Stay", value: `${nights} night${nights !== 1 ? "s" : ""}` },
          { label: "Guests", value: `${totalGuests} guest${totalGuests !== 1 ? "s" : ""}` },
        ]}
        onClose={() => { setShowCelebration(false); handleClose(); }}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="!max-w-none !w-auto !left-[var(--sidebar-width,16rem)] !right-0 !top-0 !translate-x-0 !translate-y-0 h-screen sm:rounded-none p-6 overflow-y-auto">
          <UniversalVoucher
            details={{
              type: "hotel",
              bookingId: bookingResult.id,
              bookingNumber: bookingResult.number,
              serviceName: hotel.name,
              totalAmount: totalPrice,
              passengerCount: totalGuests,
              passengerNames: bookingResult.passengerData.passengers.map(
                p => `${p.firstName} ${p.lastName}`
              ),
              contactEmail: bookingResult.passengerData.contactEmail,
              contactPhone: bookingResult.passengerData.contactPhone,
              destination: `${hotel.cities?.name}, ${hotel.cities?.country}`,
              hotelName: hotel.name,
              checkInDate: checkIn,
              checkOutDate: checkOut,
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
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-none !w-auto !left-[var(--sidebar-width,16rem)] !right-0 !top-0 !translate-x-0 !translate-y-0 h-screen sm:rounded-none overflow-y-auto p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
          {/* Left Panel - Main Content */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="text-xl">Book Hotel</DialogTitle>
            </DialogHeader>

            {/* Hotel Summary Card */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-5 space-y-4 border border-primary/20">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                  {hotel.images?.[0] ? (
                    <img src={hotel.images[0]} alt={hotel.name} className="w-full h-full object-cover" />
                  ) : (
                    <Hotel className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{hotel.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(hotel.star_rating || 3)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 text-gold fill-gold" />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {hotel.cities?.name}, {hotel.cities?.country}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">${pricePerNight}</p>
                  <p className="text-xs text-muted-foreground">per night</p>
                  <p className="text-[10px] font-semibold text-primary/80 mt-0.5 uppercase tracking-wider">{displayRoomTypeName}</p>
                </div>
              </div>

              {/* Dates - hide when coming from search (already chosen) */}
              {!hasSearchParams && (
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-primary/20">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Check-in</label>
                    <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !checkIn && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkIn ? format(checkIn, "dd/MM/yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkIn}
                          onSelect={(d) => {
                            setCheckIn(d);
                            setCheckInOpen(false);
                            if (d && (!checkOut || checkOut <= d)) {
                              setCheckOut(addDays(d, 1));
                            }
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Check-out</label>
                    <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !checkOut && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkOut ? format(checkOut, "dd/MM/yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkOut}
                          onSelect={(d) => {
                            setCheckOut(d);
                            setCheckOutOpen(false);
                          }}
                          disabled={(date) => checkIn ? date <= checkIn : date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>

            {isSoldOut && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                Sold out for these dates. Please choose different dates to continue.
              </div>
            )}

            {/* Room Configurator - hide when coming from search */}
            {!hasSearchParams && (
              <HotelRoomConfigurator
                rooms={rooms}
                onRoomsChange={(r) => {
                  setRooms(r);
                  setGuestsApplied(false);
                }}
                onApply={handleApplyGuests}
              />
            )}

            {/* Passenger Forms - grouped by room */}
            {guestsApplied && nights > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Guest Details
                </h3>
                <PassengerDetailsForm
                  passengerCount={totalGuests}
                  onSubmit={handleGuestSubmit}
                  isLoading={createBooking.isPending}
                  maxPassengers={30}
                  showPassengerCounter={false}
                  roomAssignments={roomAssignments}
                  pricePerGuest={pricePerGuest}
                  hideGuestTotal={true}
                />
              </div>
            )}
          </div>

          {/* Right Panel - Booking Summary Sidebar */}
          <div className="hidden lg:block border-l border-border bg-muted/20 p-5">
            <div className="sticky top-0 space-y-5">
              <h4 className="font-bold text-base">Booking Summary</h4>

              {/* Hotel image & info */}
              <div className="rounded-xl overflow-hidden border border-border">
                {hotel.images?.[0] ? (
                  <img src={hotel.images[0]} alt={hotel.name} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-muted flex items-center justify-center">
                    <Hotel className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <h5 className="font-semibold text-sm">{hotel.name}</h5>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {hotel.cities?.name}, {hotel.cities?.country}
                  </p>
                  <div className="flex items-center gap-0.5">
                    {[...Array(hotel.star_rating || 3)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 text-gold fill-gold" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Check-in</span>
                  <span className="font-medium">{checkIn ? format(checkIn, "dd/MM/yyyy") : "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Check-out</span>
                  <span className="font-medium">{checkOut ? format(checkOut, "dd/MM/yyyy") : "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{nights} night{nights !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Room breakdown */}
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rooms</p>
                {rooms.map((room, idx) => {
                  const ch = room.children6to12 + room.children2to6;
                  return (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Room {idx + 1}</span>
                      <span className="font-medium">
                        {room.adults} Adult{room.adults > 1 ? 's' : ''}
                        {ch > 0 && `, ${ch} Child${ch > 1 ? 'ren' : ''}`}
                        {room.infants > 0 && `, ${room.infants} Infant${room.infants > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Price breakdown */}
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</p>
                {perRoomPricing.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-sm gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5 min-w-0">
                      Room {idx + 1}
                      <Badge variant="outline" className="text-[9px] font-medium border-primary/30 text-primary h-4 px-1.5 truncate">
                        {p.displayType}
                      </Badge>
                    </span>
                    <span className="font-medium whitespace-nowrap">${p.price} × {nights} night{nights !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t-2 border-primary/30 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total</span>
                  <span className="text-2xl font-bold text-primary">${totalPrice}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {nights} night{nights !== 1 ? 's' : ''} across {roomCount} room{roomCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
